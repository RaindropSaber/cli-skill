import { cac, type CAC } from "cac";
import { ensureSkillConfigEntry } from "./config";
import { createRuntime, disposeRuntime } from "./runtime";
import type { AnyTool, SkillDefinition } from "./types";

export interface SkillCliRunner {
  app: CAC;
  run(argv?: string[]): Promise<number>;
}

export interface SkillCliRunOptions {
  rootDir?: string;
}

interface RunCommandOptions {
  headed?: boolean;
}

function printToolList(skill: SkillDefinition): number {
  for (const tool of skill.tools) {
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

async function runTool(
  skill: SkillDefinition,
  toolName: string,
  rawInput: string | undefined,
  options: RunCommandOptions,
): Promise<number> {
  const tool = findTool(skill, toolName);
  const input = rawInput ? JSON.parse(rawInput) : {};
  const parsedInput = tool.inputSchema.parse(input);
  const runtime = await createRuntime({ headed: options.headed, skill });

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

export function createCliApp(skill: SkillDefinition): CAC {
  const cli = cac(skill.name);

  cli
    .command("list", "List registered tools")
    .action(() => printToolList(skill));

  cli
    .command("run <toolName> [rawInput]", "Run a tool with JSON input")
    .option("--headed", "Open a visible browser window")
    .action((toolName: string, rawInput: string | undefined, options: RunCommandOptions) =>
      runTool(skill, toolName, rawInput, options),
    );

  cli.help();
  return cli;
}

export function createCliRunner(skill: SkillDefinition): SkillCliRunner {
  const app = createCliApp(skill);

  return {
    app,
    async run(argv = process.argv.slice(2)): Promise<number> {
      app.parse(["node", skill.name, ...argv], { run: false });
      const result = await app.runMatchedCommand();
      return typeof result === "number" ? result : 0;
    },
  };
}

export async function runCli(
  skill: SkillDefinition,
  argv = process.argv.slice(2),
  options: SkillCliRunOptions = {},
): Promise<number> {
  const resolvedSkill =
    options.rootDir && !skill.rootDir
      ? {
          ...skill,
          rootDir: options.rootDir,
        }
      : skill;

  await ensureSkillConfigEntry(resolvedSkill);
  const runner = createCliRunner(resolvedSkill);
  return runner.run(argv);
}
