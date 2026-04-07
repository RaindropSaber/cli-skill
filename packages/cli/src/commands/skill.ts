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

function looksLikePath(value: string): boolean {
  return value.startsWith("/") || value.startsWith("./") || value.startsWith("../") || value.startsWith("~/");
}

async function resolveMountTarget(skillOrTargetPath?: string) {
  if (!skillOrTargetPath || looksLikePath(skillOrTargetPath)) {
    return {
      resolved: await getCurrentSkillProject(),
      targetPath: skillOrTargetPath,
      shouldBuild: true,
    };
  }

  return {
    resolved: await resolveRegisteredSkillProject(skillOrTargetPath),
    targetPath: undefined,
    shouldBuild: false,
  };
}

export function registerSkillCommands(cli: CAC): void {
  cli
    .command("exec <skillName> <toolName> [rawInput]", "Execute a tool from a registered cli skill")
    .option("--headed", "Run browser tools with a visible browser window")
    .action(async (skillName: string, toolName: string, rawInput: string | undefined, options: { headed?: boolean }) => {
      const resolved = await resolveRegisteredSkillProject(skillName);
      const skill = await loadSkillDefinition(resolved.projectPath);
      const exitCode = await runTool(skill, toolName, rawInput, {
        rootDir: resolved.projectPath,
        headed: options.headed,
      });
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
    .option("--headed", "Run browser tools with a visible browser window")
    .action(async (toolName: string, rawInput: string | undefined, options: { headed?: boolean }) => {
      const resolved = await getCurrentSkillProject();
      const skill = await loadSkillDefinition(resolved.projectPath);
      const exitCode = await runTool(skill, toolName, rawInput, {
        rootDir: resolved.projectPath,
        headed: options.headed,
      });
      process.exitCode = exitCode;
    });

  cli.command("build", "Generate skill artifacts for the current cli skill project").action(async () => {
    const resolved = await getCurrentSkillProject();
    const skill = await loadSkillDefinition(resolved.projectPath);
    const updatedPath = await writeSkillDocsMarkdown(skill);
    console.log(updatedPath);
  });

  cli.command("mount [skillNameOrTargetPath] [targetPath]", "Mount the current cli skill project or a registered cli skill for agents").action(async (skillNameOrTargetPath?: string, targetPath?: string) => {
    const { resolved, targetPath: inferredTargetPath, shouldBuild } = await resolveMountTarget(skillNameOrTargetPath);
    const finalTargetPath = targetPath ?? inferredTargetPath;

    if (shouldBuild) {
      const skill = await loadSkillDefinition(resolved.projectPath);
      await writeSkillDocsMarkdown(skill);
    }

    const mountedPath = await mountSkillProject(resolved.projectPath, { skillRoot: finalTargetPath });
    console.log(mountedPath);
  });

  cli.command("unmount [skillNameOrTargetPath] [targetPath]", "Unmount the current cli skill project or a registered cli skill for agents").action(async (skillNameOrTargetPath?: string, targetPath?: string) => {
    const { resolved, targetPath: inferredTargetPath } = await resolveMountTarget(skillNameOrTargetPath);
    const finalTargetPath = targetPath ?? inferredTargetPath;
    const mountedPath = await unmountSkillProject(resolved.projectPath, { skillRoot: finalTargetPath });
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
