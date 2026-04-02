import type { CAC } from "cac";
import { listTools, runTool } from "@cli-skill/core";
import { writeSkillDocsMarkdown } from "../build";
import { runBunStreaming } from "../bun";
import { loadSkillDefinition } from "../project";
import {
  getCurrentSkillProject,
  mountSkillProject,
  resolveRegisteredSkillProject,
  unmountSkillProject,
} from "../registry";

export function registerSkillCommands(cli: CAC): void {
  cli
    .command("exec <skillName> <toolName> [rawInput]", "Execute a tool from a registered cli skill")
    .action(async (skillName: string, toolName: string, rawInput?: string) => {
      const resolved = await resolveRegisteredSkillProject(skillName);
      const skill = await loadSkillDefinition(resolved.projectPath);
      const exitCode = await runTool(skill, toolName, rawInput, { rootDir: resolved.projectPath });
      process.exitCode = exitCode;
    });

  cli.command("tools [skillName]", "List tools in the current cli skill project or a registered cli skill").action(async (skillName?: string) => {
    const resolved = skillName ? await resolveRegisteredSkillProject(skillName) : await getCurrentSkillProject();
    const skill = await loadSkillDefinition(resolved.projectPath);
    const exitCode = await listTools(skill, { rootDir: resolved.projectPath });
    process.exitCode = exitCode;
  });

  cli
    .command("run <toolName> [rawInput]", "Run a tool in the current cli skill project")
    .action(async (toolName: string, rawInput?: string) => {
      const resolved = await getCurrentSkillProject();
      const skill = await loadSkillDefinition(resolved.projectPath);
      const exitCode = await runTool(skill, toolName, rawInput, { rootDir: resolved.projectPath });
      process.exitCode = exitCode;
    });

  cli.command("build", "Generate skill artifacts for the current cli skill project").action(async () => {
    const resolved = await getCurrentSkillProject();
    const skill = await loadSkillDefinition(resolved.projectPath);
    const updatedPath = await writeSkillDocsMarkdown(skill);
    console.log(updatedPath);
  });

  cli.command("mount [targetPath]", "Mount the current cli skill project for agents").action(async (targetPath?: string) => {
    const resolved = await getCurrentSkillProject();
    const skill = await loadSkillDefinition(resolved.projectPath);
    await writeSkillDocsMarkdown(skill);
    const mountedPath = await mountSkillProject(resolved.projectPath, { skillRoot: targetPath });
    console.log(mountedPath);
  });

  cli.command("unmount [targetPath]", "Unmount the current cli skill project for agents").action(async (targetPath?: string) => {
    const resolved = await getCurrentSkillProject();
    const mountedPath = await unmountSkillProject(resolved.projectPath, { skillRoot: targetPath });
    console.log(mountedPath);
  });

  cli
    .command("publish", "Publish the current cli skill project")
    .option("--dry-run", "Run publish without uploading")
    .option("--tag <tag>", "Publish under a specific dist-tag")
    .action(async (options: { dryRun?: boolean; tag?: string }) => {
      const resolved = await getCurrentSkillProject();
      const skill = await loadSkillDefinition(resolved.projectPath);
      await writeSkillDocsMarkdown(skill);

      const publishArgs = ["publish"];
      if (options.dryRun) {
        publishArgs.push("--dry-run");
      }
      if (options.tag) {
        publishArgs.push("--tag", options.tag);
      }

      await runBunStreaming(publishArgs, resolved.projectPath);
    });
}
