import { ensureSkillConfigEntry } from "./config";
import { createRuntime, disposeRuntime } from "./runtime";
import type { AnyTool, SkillDefinition } from "./types";

export interface RunToolOptions {
  headed?: boolean;
  rootDir?: string;
}

function withRootDir(skill: SkillDefinition, rootDir?: string): SkillDefinition {
  return rootDir && !skill.rootDir
    ? {
        ...skill,
        rootDir,
      }
    : skill;
}

export async function listTools(skill: SkillDefinition, options: { rootDir?: string } = {}): Promise<number> {
  const resolvedSkill = withRootDir(skill, options.rootDir);
  await ensureSkillConfigEntry(resolvedSkill);

  for (const tool of resolvedSkill.tools) {
    console.log(`${tool.name}\t${tool.description}`);
  }

  return 0;
}

function findTool(skill: SkillDefinition, toolName: string): AnyTool {
  const tool = skill.tools.find((item) => item.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool "${toolName}".`);
  }

  return tool;
}

export async function runTool(
  skill: SkillDefinition,
  toolName: string,
  rawInput: string | undefined,
  options: RunToolOptions = {},
): Promise<number> {
  const resolvedSkill = withRootDir(skill, options.rootDir);
  await ensureSkillConfigEntry(resolvedSkill);

  const tool = findTool(resolvedSkill, toolName);
  const input = rawInput ? JSON.parse(rawInput) : {};
  const parsedInput = tool.inputSchema.parse(input);
  const runtime = await createRuntime({ headed: options.headed, skill: resolvedSkill });

  try {
    const result = await tool.run(parsedInput, runtime);
    const parsedOutput = tool.outputSchema.parse(result);
    console.log(JSON.stringify(parsedOutput, null, 2));

    if (typeof parsedOutput === "object" && parsedOutput && "ok" in parsedOutput) {
      return parsedOutput.ok === true ? 0 : 2;
    }

    return 0;
  } finally {
    await disposeRuntime(runtime);
  }
}
