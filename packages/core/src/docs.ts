import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { type ZodRawShape, type ZodTypeAny } from "zod";
import type { SkillDefinition } from "./types";

const CONFIG_MARKER_START = "<!-- BEGIN GENERATED CONFIG -->";
const CONFIG_MARKER_END = "<!-- END GENERATED CONFIG -->";
const TOOLS_MARKER_START = "<!-- BEGIN GENERATED TOOLS -->";
const TOOLS_MARKER_END = "<!-- END GENERATED TOOLS -->";

interface FieldInfo {
  schema: ZodTypeAny;
  optional: boolean;
  defaultValue?: unknown;
}

interface DocRow {
  path: string;
  type: string;
  notes: string;
}

function unwrapField(schema: ZodTypeAny): FieldInfo {
  let current = schema;
  let optional = false;
  let defaultValue: unknown;

  while (true) {
    if (current?._def?.typeName === "ZodOptional") {
      optional = true;
      current = current._def.innerType;
      continue;
    }

    if (current?._def?.typeName === "ZodDefault") {
      optional = true;
      defaultValue = current._def.defaultValue();
      current = current._def.innerType;
      continue;
    }

    if (current?._def?.typeName === "ZodNullable") {
      current = current._def.innerType;
      continue;
    }

    break;
  }

  return { schema: current, optional, defaultValue };
}

function getTypeName(schema: ZodTypeAny): string | undefined {
  return schema?._def?.typeName;
}

function getObjectShape(schema: ZodTypeAny): ZodRawShape | null {
  if (getTypeName(schema) !== "ZodObject") {
    return null;
  }

  const objectSchema = schema as ZodTypeAny & {
    _def: { shape?: (() => ZodRawShape) | ZodRawShape };
    shape?: ZodRawShape;
  };

  if (typeof objectSchema._def.shape === "function") {
    return objectSchema._def.shape();
  }

  if (objectSchema._def.shape) {
    return objectSchema._def.shape;
  }

  return objectSchema.shape ?? null;
}

function describeType(schema: ZodTypeAny): string {
  const field = unwrapField(schema);
  const base = field.schema;
  const typeName = getTypeName(base);

  if (typeName === "ZodString") {
    return "string";
  }

  if (typeName === "ZodNumber") {
    return "number";
  }

  if (typeName === "ZodBoolean") {
    return "boolean";
  }

  if (typeName === "ZodLiteral") {
    return JSON.stringify(base._def.value);
  }

  if (typeName === "ZodEnum") {
    return (base as ZodTypeAny & { options: string[] }).options
      .map((item: string) => JSON.stringify(item))
      .join(" | ");
  }

  if (typeName === "ZodArray") {
    return `array<${describeType(base._def.type)}>`;
  }

  if (typeName === "ZodObject") {
    return "object";
  }

  return "unknown";
}

function describeNotes(schema: ZodTypeAny): string {
  const field = unwrapField(schema);
  const notes: string[] = [];

  if (field.optional) {
    notes.push("可选");
  }

  if (typeof field.defaultValue !== "undefined") {
    notes.push(`默认值: ${JSON.stringify(field.defaultValue)}`);
  }

  return notes.join("; ");
}

function collectShapeRows(shape: ZodRawShape, prefix = ""): DocRow[] {
  const rows: DocRow[] = [];

  for (const [key, schema] of Object.entries(shape)) {
    const field = unwrapField(schema);
    const rowPath = prefix ? `${prefix}.${key}` : key;
    rows.push({
      path: rowPath,
      type: describeType(schema),
      notes: describeNotes(schema),
    });

    const childShape = getObjectShape(field.schema);
    if (childShape) {
      rows.push(...collectShapeRows(childShape, rowPath));
    }
  }

  return rows;
}

function collectSchemaRows(schema: ZodTypeAny): DocRow[] {
  const field = unwrapField(schema);
  const shape = getObjectShape(field.schema);
  if (!shape) {
    return [
      {
        path: "(value)",
        type: describeType(schema),
        notes: describeNotes(schema),
      },
    ];
  }

  const rows = collectShapeRows(shape);
  return rows.length > 0 ? rows : [];
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br/>");
}

function renderTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "- 无";
  }

  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => escapeCell(cell || " ")).join(" | ")} |`),
  ];

  return lines.join("\n");
}

function renderConfigSection(skill: SkillDefinition): string {
  const rows = collectShapeRows(skill.config).map((row) => [row.path, row.type, row.notes || ""]);
  return renderTable(["字段", "类型", "说明"], rows.length > 0 ? rows : [["-", "-", "-"]]);
}

function renderToolsSection(skill: SkillDefinition): string {
  const blocks: string[] = [];
  const cliName = skill.cliName ?? skill.name;

  const toolTable = renderTable(
    ["工具", "说明"],
    skill.tools.map((tool) => [tool.name, tool.description]),
  );
  blocks.push(toolTable);

  for (const tool of skill.tools) {
    blocks.push("");
    blocks.push(`### \`${tool.name}\``);
    blocks.push("");
    blocks.push("**例子**");
    blocks.push("");
    const exampleRows =
      tool.examples && tool.examples.length > 0
        ? tool.examples.map((example) => [example.scenario, example.command])
        : [["默认调用", `${cliName} run ${tool.name} '<json-input>'`]];
    blocks.push(renderTable(["场景", "命令"], exampleRows));
    blocks.push("");
    blocks.push("**输入**");
    blocks.push("");
    blocks.push(
      renderTable(
        ["字段", "类型", "说明"],
        collectSchemaRows(tool.inputSchema).map((row) => [row.path, row.type, row.notes || ""]),
      ),
    );
    blocks.push("");
    blocks.push("**输出**");
    blocks.push("");
    blocks.push(
      renderTable(
        ["字段", "类型", "说明"],
        collectSchemaRows(tool.outputSchema).map((row) => [row.path, row.type, row.notes || ""]),
      ),
    );
  }

  return blocks.join("\n");
}

function replaceSection(content: string, startMarker: string, endMarker: string, replacement: string): string {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Missing markers: ${startMarker} ... ${endMarker}`);
  }

  const before = content.slice(0, start + startMarker.length);
  const after = content.slice(end);
  return `${before}\n${replacement}\n${after}`;
}

export function renderSkillDocsMarkdown(skill: SkillDefinition): string {
  return [
    "## Tool Reference",
    "",
    renderToolsSection(skill),
    "",
    "## Config Reference",
    "",
    renderConfigSection(skill),
  ].join("\n");
}

export async function writeSkillDocsMarkdown(skill: SkillDefinition): Promise<string> {
  const skillRoot = skill.rootDir ?? process.cwd();
  const skillMdPath = path.join(skillRoot, "skill", "SKILL.md");
  const current = await readFile(skillMdPath, "utf8");
  const next = replaceSection(
    replaceSection(current, CONFIG_MARKER_START, CONFIG_MARKER_END, renderConfigSection(skill)),
    TOOLS_MARKER_START,
    TOOLS_MARKER_END,
    renderToolsSection(skill),
  );

  await writeFile(skillMdPath, next, "utf8");
  return skillMdPath;
}
