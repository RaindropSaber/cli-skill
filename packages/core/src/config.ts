import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import merge from "lodash/merge";
import type { CliSkillConfig } from "./types";

function getUserHome(): string {
  return process.env.HOME || os.homedir();
}

function createHomeRelativePath(...segments: string[]): string {
  return path.join("~", ...segments);
}

function resolveUserPath(inputPath: string): string {
  if (inputPath === "~") {
    return getUserHome();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(getUserHome(), inputPath.slice(2));
  }

  return inputPath;
}

export function getCliSkillHome(): string {
  return path.join(getUserHome(), ".cli-skill");
}

export function getDefaultBrowserRunsRoot(): string {
  return path.join(getCliSkillHome(), "browser-runs");
}

export function getCliSkillConfigPath(): string {
  return path.join(getUserHome(), ".cli-skill-config.json");
}

function getLocalConfigFilePath(cwd: string): string {
  return path.join(cwd, ".cli-skill-config.json");
}

async function loadLocalCliSkillConfig(filePath: string): Promise<CliSkillConfig | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return (JSON.parse(raw) as CliSkillConfig) ?? {};
  } catch {
    return null;
  }
}

async function loadCliSkillConfigChain(cwd = process.cwd()): Promise<CliSkillConfig[]> {
  const chain: CliSkillConfig[] = [];
  let currentDir = path.resolve(cwd);

  while (true) {
    const localConfig = await loadLocalCliSkillConfig(getLocalConfigFilePath(currentDir));
    if (localConfig) {
      chain.push(localConfig);
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return chain.reverse();
}

export async function loadCliSkillConfig(): Promise<CliSkillConfig> {
  try {
    const raw = await readFile(getCliSkillConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as CliSkillConfig;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function getDefaultCliSkillConfig(): Required<
  Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserRunsRoot" | "browserUserDataDir" | "browserSourceUserDataDir" | "env" | "recordBrowserRun">
> {
  const systemChromeSourceUserDataDir =
    process.platform === "darwin"
      ? createHomeRelativePath("Library", "Application Support", "Google", "Chrome", "Default")
      : "";
  return {
    skillsRoot: createHomeRelativePath(".cli-skill", "skills"),
    agentsSkillsRoot: createHomeRelativePath(".agents", "skills"),
    browserExecutablePath: "",
    browserRunsRoot: createHomeRelativePath(".cli-skill", "browser-runs"),
    browserUserDataDir: createHomeRelativePath(".cli-skill", "browser", "user-data"),
    browserSourceUserDataDir: systemChromeSourceUserDataDir,
    env: {},
    recordBrowserRun: false,
  };
}

export async function getResolvedCliSkillConfig(): Promise<Required<Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserRunsRoot" | "browserUserDataDir" | "browserSourceUserDataDir">> & CliSkillConfig>;
export async function getResolvedCliSkillConfig(cwd: string): Promise<Required<Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserRunsRoot" | "browserUserDataDir" | "browserSourceUserDataDir">> & CliSkillConfig>;
export async function getResolvedCliSkillConfig(cwd = process.cwd()): Promise<Required<Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserRunsRoot" | "browserUserDataDir" | "browserSourceUserDataDir">> & CliSkillConfig> {
  const globalConfig = await loadCliSkillConfig();
  const localConfigChain = await loadCliSkillConfigChain(cwd);
  const defaults = getDefaultCliSkillConfig();
  const config = merge({}, defaults, globalConfig, ...localConfigChain) as CliSkillConfig;

  return {
    ...config,
    skillsRoot: resolveUserPath(config.skillsRoot ?? defaults.skillsRoot),
    agentsSkillsRoot: resolveUserPath(config.agentsSkillsRoot ?? defaults.agentsSkillsRoot),
    browserExecutablePath: resolveUserPath(config.browserExecutablePath ?? defaults.browserExecutablePath),
    browserRunsRoot: resolveUserPath(config.browserRunsRoot ?? defaults.browserRunsRoot),
    browserUserDataDir: resolveUserPath(config.browserUserDataDir ?? defaults.browserUserDataDir),
    browserSourceUserDataDir: resolveUserPath(config.browserSourceUserDataDir ?? defaults.browserSourceUserDataDir),
    env: config.env ?? defaults.env,
    recordBrowserRun: config.recordBrowserRun ?? defaults.recordBrowserRun,
  };
}
