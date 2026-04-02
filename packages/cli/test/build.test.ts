import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import type { SkillDefinition } from "@cli-skill/core";
import { defineSkill, defineTool } from "@cli-skill/core";
import { writeSkillDocsMarkdown } from "../src/build";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function createTestSkill(rootDir: string): SkillDefinition {
  const inputSchema = z.object({
    url: z.string().url().default("https://example.com"),
  });

  const outputSchema = z.object({
    title: z.string(),
    url: z.string().url(),
  });

  const tool = defineTool({
    name: "open_page",
    description: "打开页面并返回标题",
    plugins: [],
    examples: [
      {
        scenario: "打开一个页面并返回标题",
        command: "cli-skill demo run open_page '{\"url\":\"https://example.com\"}'",
      },
    ],
    inputSchema,
    outputSchema,
    async run(input) {
      return {
        title: "Example Domain",
        url: input.url,
      };
    },
  });

  return defineSkill({
    name: "demo-skill",
    description: "用于验证构建输出",
    overview: "这是一个用于验证构建输出的 skill。",
    config: {
      nested: z.object({
        enabled: z.boolean().default(true),
      }),
    },
    tools: [tool],
    rootDir,
  });
}

describe("writeSkillDocsMarkdown", () => {
  test("renders src/skill templates into root skill directory", async () => {
    const rootDir = await createTempDir("cli-skill-build-");
    const sourceSkillDir = path.join(rootDir, "src", "skill");
    await mkdir(path.join(sourceSkillDir, "agents"), { recursive: true });

    await writeFile(
      path.join(sourceSkillDir, "SKILL.md"),
      [
        "# {{name}}",
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
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(sourceSkillDir, "agents", "openai.yaml"),
      ["display_name: {{name}}", "short_description: {{description}}"].join("\n"),
      "utf8",
    );
    await writeFile(path.join(sourceSkillDir, "extra.md"), "技能名称：{{name}}\n", "utf8");

    const skill = createTestSkill(rootDir);
    const outputPath = await writeSkillDocsMarkdown(skill);
    const renderedSkillMd = await readFile(outputPath, "utf8");
    const renderedYaml = await readFile(path.join(rootDir, "skill", "agents", "openai.yaml"), "utf8");
    const renderedExtra = await readFile(path.join(rootDir, "skill", "extra.md"), "utf8");

    expect(renderedSkillMd).toContain("# demo-skill");
    expect(renderedSkillMd).toContain("这是一个用于验证构建输出的 skill。");
    expect(renderedSkillMd).toContain("| 工具 | 说明 |");
    expect(renderedSkillMd).toContain("open_page");
    expect(renderedSkillMd).toContain("| 字段 | 类型 | 说明 |");
    expect(renderedSkillMd).toContain("nested.enabled");
    expect(renderedYaml).toContain("display_name: demo-skill");
    expect(renderedYaml).toContain("short_description: 用于验证构建输出");
    expect(renderedExtra).toContain("技能名称：demo-skill");
  });
});
