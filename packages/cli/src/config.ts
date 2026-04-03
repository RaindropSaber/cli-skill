import { mkdir, readFile, writeFile } from "node:fs/promises";
import get from "lodash/get";
import set from "lodash/set";
import unset from "lodash/unset";
import os from "node:os";
import path from "node:path";

export interface BrowserSkillCliConfig {
  skillsRoot?: string;
  installedSkillsRoot?: string;
  agentsSkillsRoot?: string;
  browserStorageRoot?: string;
  skillConfig?: Record<string, Record<string, unknown>>;
}

function getUserHome(): string {
  return process.env.HOME || os.homedir();
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

export function getBrowserSkillHome(): string {
  return path.join(getUserHome(), ".cli-skill");
}

export function getBrowserSkillConfigPath(): string {
  return path.join(getBrowserSkillHome(), "config.json");
}

export async function loadBrowserSkillCliConfig(): Promise<BrowserSkillCliConfig> {
  try {
    const raw = await readFile(getBrowserSkillConfigPath(), "utf8");
    return (JSON.parse(raw) as BrowserSkillCliConfig) ?? {};
  } catch {
    return {};
  }
}

export function getDefaultBrowserSkillCliConfig(): Required<
  Pick<BrowserSkillCliConfig, "skillsRoot" | "installedSkillsRoot" | "agentsSkillsRoot" | "browserStorageRoot" | "skillConfig">
> {
  return {
    skillsRoot: path.join(getBrowserSkillHome(), "skills"),
    installedSkillsRoot: path.join(getBrowserSkillHome(), "installed"),
    agentsSkillsRoot: path.join(getUserHome(), ".agents", "skills"),
    browserStorageRoot: path.join(getBrowserSkillHome(), "browser", "storage"),
    skillConfig: {},
  };
}

export async function getResolvedBrowserSkillCliConfig(): Promise<
  Required<Pick<BrowserSkillCliConfig, "skillsRoot" | "installedSkillsRoot" | "agentsSkillsRoot" | "browserStorageRoot">> &
    BrowserSkillCliConfig
> {
  const config = await loadBrowserSkillCliConfig();
  const defaults = getDefaultBrowserSkillCliConfig();

  return {
    ...config,
    skillConfig: config.skillConfig ?? defaults.skillConfig,
    skillsRoot: resolveUserPath(config.skillsRoot ?? defaults.skillsRoot),
    installedSkillsRoot: resolveUserPath(config.installedSkillsRoot ?? defaults.installedSkillsRoot),
    agentsSkillsRoot: resolveUserPath(config.agentsSkillsRoot ?? defaults.agentsSkillsRoot),
    browserStorageRoot: resolveUserPath(config.browserStorageRoot ?? defaults.browserStorageRoot),
  };
}

export async function ensureBrowserSkillCliConfig(): Promise<string> {
  const configPath = getBrowserSkillConfigPath();
  const defaults = getDefaultBrowserSkillCliConfig();

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = (JSON.parse(raw) as BrowserSkillCliConfig) ?? {};
    const nextConfig: BrowserSkillCliConfig = {
      ...parsed,
      skillsRoot: parsed.skillsRoot ?? defaults.skillsRoot,
      installedSkillsRoot: parsed.installedSkillsRoot ?? defaults.installedSkillsRoot,
      agentsSkillsRoot: parsed.agentsSkillsRoot ?? defaults.agentsSkillsRoot,
      browserStorageRoot: parsed.browserStorageRoot ?? defaults.browserStorageRoot,
      skillConfig: parsed.skillConfig ?? defaults.skillConfig,
    };

    if (JSON.stringify(parsed) !== JSON.stringify(nextConfig)) {
      await saveBrowserSkillCliConfig(nextConfig);
    }

    return configPath;
  } catch {
    await saveBrowserSkillCliConfig(defaults);
    return configPath;
  }
}

export async function saveBrowserSkillCliConfig(config: BrowserSkillCliConfig): Promise<void> {
  const configPath = getBrowserSkillConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function getConfigValue(config: BrowserSkillCliConfig, keyPath?: string): unknown {
  if (!keyPath) {
    return config;
  }

  return get(config, keyPath);
}

export function setConfigValue(
  config: BrowserSkillCliConfig,
  keyPath: string,
  value: unknown,
): BrowserSkillCliConfig {
  const nextConfig = structuredClone(config);
  set(nextConfig as object, keyPath, value);
  return nextConfig;
}

export function unsetConfigValue(
  config: BrowserSkillCliConfig,
  keyPath: string,
): BrowserSkillCliConfig {
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
