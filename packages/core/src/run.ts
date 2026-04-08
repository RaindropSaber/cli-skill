import { createRuntime, disposeRuntime } from "./runtime";
import type { AnyTool, BrowserRunRecordingInfo, SkillDefinition } from "./types";

export interface RunToolOptions {
  headed?: boolean;
  headless?: boolean;
  rootDir?: string;
}

interface RuntimeWithBrowserRunRecording {
  browserRunRecording?: BrowserRunRecordingInfo;
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

function resolveHeadedOption(tool: AnyTool, options: RunToolOptions): boolean {
  if (options.headless === true) {
    return false;
  }
  if (options.headed === true) {
    return true;
  }
  return tool.headed === true;
}

function enrichErrorWithBrowserRunRecording(
  error: unknown,
  browserRunRecording?: BrowserRunRecordingInfo,
): never {
  if (!browserRunRecording) {
    throw error;
  }

  const nextError = error instanceof Error ? error : new Error(String(error));
  const recordingMessage = [
    "",
    "Browser run recording:",
    "Review this run before changing the tool:",
    "1. Read summary.json",
    "2. Read timeline.jsonl",
    "3. Only then expand actions.jsonl, network.jsonl, and dom.jsonl if needed",
    `- recordingDir: ${browserRunRecording.recordingDir}`,
    `- summaryPath: ${browserRunRecording.summaryPath}`,
  ].join("\n");

  if (!nextError.message.includes("Browser run recording:")) {
    nextError.message = `${nextError.message}${recordingMessage}`;
  }

  Object.assign(nextError, { browserRunRecording });
  throw nextError;
}

export async function runTool(
  skill: SkillDefinition,
  toolName: string,
  rawInput: string | undefined,
  options: RunToolOptions = {},
): Promise<number> {
  const resolvedSkill = withRootDir(skill, options.rootDir);

  const tool = findTool(resolvedSkill, toolName);
  const input = rawInput ? JSON.parse(rawInput) : {};
  const parsedInput = tool.inputSchema.parse(input);
  const runtime = await createRuntime({
    headed: resolveHeadedOption(tool, options),
    skill: resolvedSkill,
  });
  const browserRunRecording = (runtime as RuntimeWithBrowserRunRecording).browserRunRecording;

  try {
    let parsedOutput: Awaited<ReturnType<typeof tool.outputSchema.parse>>;
    try {
      const result = await tool.run(parsedInput, runtime);
      parsedOutput = tool.outputSchema.parse(result);
    } catch (error) {
      enrichErrorWithBrowserRunRecording(error, browserRunRecording);
    }
    console.log(JSON.stringify(parsedOutput, null, 2));

    if (typeof parsedOutput === "object" && parsedOutput && "ok" in parsedOutput) {
      return parsedOutput.ok === true ? 0 : 2;
    }

    return 0;
  } finally {
    await disposeRuntime(runtime);
  }
}
