import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { type ZodRawShape, type ZodTypeAny } from "zod";
import type { SkillDefinition } from "@cli-skill/core";

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
        : [["默认调用", `${skill.name} run ${tool.name} '<json-input>'`]];
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

function getDefaultSkillDocsMarkdown(): string {
  return [
    "---",
    `name: {{name}}`,
    `description: {{description}}`,
    "---",
    "",
    `# {{name}}`,
    "",
    "## 概述",
    "",
    "{{overview}}",
    "",
    "## Tool Reference",
    "",
    "{{toolReference}}",
    "",
    "## Config Reference",
    "",
    "{{configReference}}",
  ].join("\n");
}

function getDefaultOpenAIYamlTemplate(): string {
  return [
    "display_name: {{name}}",
    "short_description: {{description}}",
    "default_prompt: 使用 {{name}} 处理 {{name}} 相关任务。",
    "",
  ].join("\n");
}

function buildTemplateValues(skill: SkillDefinition): Record<string, string> {
  return {
    name: skill.name,
    description: skill.description,
    overview: skill.overview ?? `${skill.name} skill。`,
    toolReference: renderToolsSection(skill),
    configReference: renderConfigSection(skill),
  };
}

function renderSkillTemplate(template: string, skill: SkillDefinition): string {
  const values = buildTemplateValues(skill);
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
}

function isTemplatedTextFile(filePath: string): boolean {
  return [".md", ".yaml", ".yml"].includes(path.extname(filePath));
}

async function copySkillTemplateDirectory(sourceDir: string, targetDir: string, skill: SkillDefinition): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copySkillTemplateDirectory(sourcePath, targetPath, skill);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const template = await readFile(sourcePath, "utf8");
    const content = isTemplatedTextFile(sourcePath)
      ? renderSkillTemplate(template, skill)
      : template;
    await writeFile(targetPath, `${content}${content.endsWith("\n") ? "" : "\n"}`, "utf8");
  }
}

async function getLegacySkillDocsTemplate(skill: SkillDefinition): Promise<string | null> {
  const skillRoot = skill.rootDir ?? process.cwd();
  const templatePath = path.join(skillRoot, "src", "skill.md");

  try {
    return await readFile(templatePath, "utf8");
  } catch {
    return null;
  }
}

async function getSkillTemplateDirectory(skill: SkillDefinition): Promise<string | null> {
  const skillRoot = skill.rootDir ?? process.cwd();
  const templateDir = path.join(skillRoot, "src", "skill");

  try {
    const templateStat = await stat(templateDir);
    return templateStat.isDirectory() ? templateDir : null;
  } catch {
    return null;
  }
}

async function getSkillDocsTemplateFromDirectory(skill: SkillDefinition): Promise<string | null> {
  const templateDir = await getSkillTemplateDirectory(skill);
  if (!templateDir) {
    return null;
  }

  try {
    return await readFile(path.join(templateDir, "SKILL.md"), "utf8");
  } catch {
    return null;
  }
}

export async function renderSkillDocsMarkdown(skill: SkillDefinition): Promise<string> {
  const directoryTemplate = await getSkillDocsTemplateFromDirectory(skill);
  const legacyTemplate = directoryTemplate ? null : await getLegacySkillDocsTemplate(skill);
  return renderSkillTemplate(directoryTemplate ?? legacyTemplate ?? getDefaultSkillDocsMarkdown(), skill);
}

export function renderSkillOpenAIYaml(skill: SkillDefinition): string {
  return renderSkillTemplate(getDefaultOpenAIYamlTemplate(), skill);
}

export async function writeSkillDocsMarkdown(skill: SkillDefinition): Promise<string> {
  const skillRoot = skill.rootDir ?? process.cwd();
  const targetDir = path.join(skillRoot, "skill");
  const skillMdPath = path.join(targetDir, "SKILL.md");
  const templateDir = await getSkillTemplateDirectory(skill);

  await mkdir(targetDir, { recursive: true });

  if (templateDir) {
    await copySkillTemplateDirectory(templateDir, targetDir, skill);
  } else {
    const skillMarkdown = await renderSkillDocsMarkdown(skill);
    const openAIYamlPath = path.join(targetDir, "agents", "openai.yaml");
    await mkdir(path.dirname(openAIYamlPath), { recursive: true });
    await writeFile(skillMdPath, `${skillMarkdown}\n`, "utf8");
    await writeFile(openAIYamlPath, renderSkillOpenAIYaml(skill), "utf8");
  }

  return skillMdPath;
}
