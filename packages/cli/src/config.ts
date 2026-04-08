import { mkdir, readFile, writeFile } from "node:fs/promises";
import get from "lodash/get";
import merge from "lodash/merge";
import set from "lodash/set";
import unset from "lodash/unset";
import os from "node:os";
import path from "node:path";

export interface CliSkillUserConfig {
  [key: string]: unknown;
  skillsRoot?: string;
  agentsSkillsRoot?: string;
  browserExecutablePath?: string;
  browserUserDataDir?: string;
  browserSourceUserDataDir?: string;
  env?: Record<string, string>;
  recordBrowserRun?: boolean;
}

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

export function getCliSkillConfigPath(): string {
  return path.join(getUserHome(), ".cli-skill-config.json");
}

export function getLocalCliSkillConfigPath(cwd = process.cwd()): string {
  return path.join(cwd, ".cli-skill-config.json");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function findNearestLocalCliSkillConfigPath(
  cwd = process.cwd(),
): Promise<string | null> {
  let currentDir = path.resolve(cwd);

  while (true) {
    const filePath = getLocalCliSkillConfigPath(currentDir);
    if (await pathExists(filePath)) {
      return filePath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

async function loadLocalCliSkillConfig(filePath: string): Promise<CliSkillUserConfig | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return (JSON.parse(raw) as CliSkillUserConfig) ?? {};
  } catch {
    return null;
  }
}

async function loadCliSkillConfigChain(cwd = process.cwd()): Promise<CliSkillUserConfig[]> {
  const chain: CliSkillUserConfig[] = [];
  let currentDir = path.resolve(cwd);

  while (true) {
    const localConfig = await loadLocalCliSkillConfig(getLocalCliSkillConfigPath(currentDir));
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

export async function loadCliSkillConfig(): Promise<CliSkillUserConfig> {
  return loadCliSkillConfigFile(getCliSkillConfigPath());
}

export async function loadCliSkillConfigFile(filePath: string): Promise<CliSkillUserConfig> {
  try {
    const raw = await readFile(filePath, "utf8");
    return (JSON.parse(raw) as CliSkillUserConfig) ?? {};
  } catch {
    return {};
  }
}

export function getDefaultCliSkillConfig(): Required<
  Pick<CliSkillUserConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserUserDataDir" | "browserSourceUserDataDir" | "env" | "recordBrowserRun">
> {
  const systemChromeSourceUserDataDir =
    process.platform === "darwin"
      ? createHomeRelativePath("Library", "Application Support", "Google", "Chrome", "Default")
      : "";
  return {
    skillsRoot: createHomeRelativePath(".cli-skill", "skills"),
    agentsSkillsRoot: createHomeRelativePath(".agents", "skills"),
    browserExecutablePath: "",
    browserUserDataDir: createHomeRelativePath(".cli-skill", "browser", "user-data"),
    browserSourceUserDataDir: systemChromeSourceUserDataDir,
    env: {},
    recordBrowserRun: false,
  };
}

export async function getResolvedCliSkillConfig(): Promise<
  Required<Pick<CliSkillUserConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserUserDataDir" | "browserSourceUserDataDir">> &
    CliSkillUserConfig
>;
export async function getResolvedCliSkillConfig(cwd: string): Promise<
  Required<Pick<CliSkillUserConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserUserDataDir" | "browserSourceUserDataDir">> &
    CliSkillUserConfig
>;
export async function getResolvedCliSkillConfig(cwd = process.cwd()): Promise<
  Required<Pick<CliSkillUserConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserUserDataDir" | "browserSourceUserDataDir">> &
    CliSkillUserConfig
> {
  const globalConfig = await loadCliSkillConfig();
  const localConfigChain = await loadCliSkillConfigChain(cwd);
  const defaults = getDefaultCliSkillConfig();
  const config = merge({}, defaults, globalConfig, ...localConfigChain) as CliSkillUserConfig;

  return {
    ...config,
    skillsRoot: resolveUserPath(config.skillsRoot ?? defaults.skillsRoot),
    agentsSkillsRoot: resolveUserPath(config.agentsSkillsRoot ?? defaults.agentsSkillsRoot),
    browserExecutablePath: resolveUserPath(config.browserExecutablePath ?? defaults.browserExecutablePath),
    browserUserDataDir: resolveUserPath(config.browserUserDataDir ?? defaults.browserUserDataDir),
    browserSourceUserDataDir: resolveUserPath(config.browserSourceUserDataDir ?? defaults.browserSourceUserDataDir),
    env: config.env ?? defaults.env,
    recordBrowserRun: config.recordBrowserRun ?? defaults.recordBrowserRun,
  };
}

export async function ensureCliSkillConfig(): Promise<string> {
  const configPath = getCliSkillConfigPath();
  const defaults = getDefaultCliSkillConfig();

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = (JSON.parse(raw) as CliSkillUserConfig) ?? {};
    const nextConfig: CliSkillUserConfig = {
      skillsRoot: parsed.skillsRoot ?? defaults.skillsRoot,
      agentsSkillsRoot: parsed.agentsSkillsRoot ?? defaults.agentsSkillsRoot,
      browserExecutablePath: parsed.browserExecutablePath ?? defaults.browserExecutablePath,
      browserUserDataDir: parsed.browserUserDataDir ?? defaults.browserUserDataDir,
      browserSourceUserDataDir: parsed.browserSourceUserDataDir ?? defaults.browserSourceUserDataDir,
      env: parsed.env ?? defaults.env,
      recordBrowserRun: parsed.recordBrowserRun ?? defaults.recordBrowserRun,
    };

    if (JSON.stringify(parsed) !== JSON.stringify(nextConfig)) {
      await saveCliSkillConfig(nextConfig);
    }

    return configPath;
  } catch {
    await saveCliSkillConfig(defaults);
    return configPath;
  }
}

export async function saveCliSkillConfig(config: CliSkillUserConfig): Promise<void> {
  await saveCliSkillConfigFile(getCliSkillConfigPath(), config);
}

export async function saveCliSkillConfigFile(
  filePath: string,
  config: CliSkillUserConfig,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function getConfigValue(config: CliSkillUserConfig, keyPath?: string): unknown {
  if (!keyPath) {
    return config;
  }

  return get(config, keyPath);
}

export function setConfigValue(
  config: CliSkillUserConfig,
  keyPath: string,
  value: unknown,
): CliSkillUserConfig {
  const nextConfig = structuredClone(config);
  set(nextConfig as object, keyPath, value);
  return nextConfig;
}

export function unsetConfigValue(
  config: CliSkillUserConfig,
  keyPath: string,
): CliSkillUserConfig {
  const nextConfig = structuredClone(config);
  unset(nextConfig as object, keyPath);
  return nextConfig;
}

export function parseConfigCliValue(rawValue: string): unknown {
  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  if (rawValue === "null") {
    return null;
  }

  if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
    return Number(rawValue);
  }

  if (
    (rawValue.startsWith("{") && rawValue.endsWith("}")) ||
    (rawValue.startsWith("[") && rawValue.endsWith("]")) ||
    (rawValue.startsWith("\"") && rawValue.endsWith("\""))
  ) {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  return rawValue;
}
