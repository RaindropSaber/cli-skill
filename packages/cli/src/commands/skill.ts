import type { CAC } from "cac";
import { runCli } from "@cli-skill/core";
import {
  getConfigValue,
  loadBrowserSkillCliConfig,
  parseConfigCliValue,
  saveBrowserSkillCliConfig,
  setConfigValue,
  unsetConfigValue,
} from "../config";
import { writeSkillDocsMarkdown } from "../build";
import { loadSkillDefinition } from "../project";
import {
  getLocalSkillProjectDir,
  mountSkillProject,
  resolveSkillProject,
  unmountSkillProject,
} from "../registry";
import { runBun } from "../bun";

function printConfigValue(value: unknown): void {
  if (typeof value === "string") {
    console.log(value);
    return;
  }

  if (typeof value === "undefined") {
    console.log("undefined");
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

function printSkillUsage(skillName: string): never {
  throw new Error(
    [
      `Usage: cli-skill ${skillName} run <toolName> [rawInput]`,
      `       cli-skill ${skillName} list`,
      `       cli-skill ${skillName} config get [keyPath]`,
      `       cli-skill ${skillName} config set <keyPath> <value>`,
      `       cli-skill ${skillName} config unset <keyPath>`,
      `       cli-skill ${skillName} mount [targetPath]`,
      `       cli-skill ${skillName} unmount [targetPath]`,
      `       cli-skill ${skillName} build`,
      `       cli-skill ${skillName} publish [--dry-run] [--tag <tag>]`,
    ].join("\n"),
  );
}

async function handleSkillConfig(skillName: string, args: string[]): Promise<void> {
  const [subcommand, keyPath, rawValue] = args;
  const configRoot = `skillConfig.${skillName}`;

  if (subcommand === "get") {
    const currentConfig = await loadBrowserSkillCliConfig();
    const value = getConfigValue(currentConfig, keyPath ? `${configRoot}.${keyPath}` : configRoot);
    printConfigValue(value);
    return;
  }

  if (subcommand === "set") {
    if (!keyPath || typeof rawValue === "undefined") {
      throw new Error(`Usage: cli-skill ${skillName} config set <keyPath> <value>`);
    }

    const currentConfig = await loadBrowserSkillCliConfig();
    const nextConfig = setConfigValue(
      currentConfig,
      `${configRoot}.${keyPath}`,
      parseConfigCliValue(rawValue),
    );
    await saveBrowserSkillCliConfig(nextConfig);
    return;
  }

  if (subcommand === "unset") {
    if (!keyPath) {
      throw new Error(`Usage: cli-skill ${skillName} config unset <keyPath>`);
    }

    const currentConfig = await loadBrowserSkillCliConfig();
    const nextConfig = unsetConfigValue(currentConfig, `${configRoot}.${keyPath}`);
    await saveBrowserSkillCliConfig(nextConfig);
    return;
  }

  throw new Error(
    `Usage: cli-skill ${skillName} config get [keyPath] | set <keyPath> <value> | unset <keyPath>`,
  );
}

async function handleSkillCommand(skillName: string, args: string[] = []): Promise<void> {
  if (args.length === 0) {
    printSkillUsage(skillName);
  }

  const [subcommand, ...rest] = args;
  const resolved = await resolveSkillProject(skillName);

  if (subcommand === "run" || subcommand === "list") {
    const skill = await loadSkillDefinition(resolved.projectPath);
    const exitCode = await runCli(
      skill,
      subcommand === "list" ? ["list"] : ["run", ...rest],
      { rootDir: resolved.projectPath },
    );
    process.exitCode = exitCode;
    return;
  }

  if (subcommand === "config") {
    await handleSkillConfig(skillName, rest);
    return;
  }

  if (subcommand === "mount") {
    const [targetPath] = rest;
    const mountedPath = await mountSkillProject(resolved.projectPath, { skillRoot: targetPath });
    console.log(mountedPath);
    return;
  }

  if (subcommand === "unmount") {
    const [targetPath] = rest;
    const mountedPath = await unmountSkillProject(resolved.projectPath, { skillRoot: targetPath });
    console.log(mountedPath);
    return;
  }

  if (subcommand === "build") {
    const skill = await loadSkillDefinition(resolved.projectPath);
    const updatedPath = await writeSkillDocsMarkdown(skill);
    console.log(updatedPath);
    return;
  }

  if (subcommand === "publish") {
    const localProjectDir = await getLocalSkillProjectDir(skillName);
    const publishArgs = ["publish"];
    const dryRunIndex = rest.indexOf("--dry-run");
    const tagIndex = rest.indexOf("--tag");

    if (dryRunIndex >= 0) {
      publishArgs.push("--dry-run");
    }

    if (tagIndex >= 0) {
      const tag = rest[tagIndex + 1];
      if (!tag) {
        throw new Error(`Usage: cli-skill ${skillName} publish [--dry-run] [--tag <tag>]`);
      }
      publishArgs.push("--tag", tag);
    }

    await runBun(publishArgs, localProjectDir);
    return;
  }

  printSkillUsage(skillName);
}

export function registerSkillCommand(cli: CAC): void {
  cli
    .command("<skillName> [...args]", "Operate on a specific cli skill")
    .allowUnknownOptions()
    .action(async (skillName: string, args: string[] = []) => {
      await handleSkillCommand(skillName, args);
    });
}
