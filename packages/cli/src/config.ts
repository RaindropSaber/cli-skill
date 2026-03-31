import { mkdir, readFile, writeFile } from "node:fs/promises";
import get from "lodash/get";
import set from "lodash/set";
import os from "node:os";
import path from "node:path";

export interface BrowserSkillCliConfig {
  skillsRoot?: string;
  agentsSkillsRoot?: string;
  skillConfig?: Record<string, Record<string, unknown>>;
}

function resolveUserPath(inputPath: string): string {
  if (inputPath === "~") {
    return os.homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}

export function getBrowserSkillHome(): string {
  return path.join(os.homedir(), ".browser-skill");
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
  Pick<BrowserSkillCliConfig, "skillsRoot" | "agentsSkillsRoot" | "skillConfig">
> {
  return {
    skillsRoot: path.join(getBrowserSkillHome(), "skills"),
    agentsSkillsRoot: path.join(os.homedir(), ".agents", "skills"),
    skillConfig: {},
  };
}

export async function getResolvedBrowserSkillCliConfig(): Promise<
  Required<Pick<BrowserSkillCliConfig, "skillsRoot" | "agentsSkillsRoot">> & BrowserSkillCliConfig
> {
  const config = await loadBrowserSkillCliConfig();
  const defaults = getDefaultBrowserSkillCliConfig();

  return {
    ...config,
    skillConfig: config.skillConfig ?? defaults.skillConfig,
    skillsRoot: resolveUserPath(config.skillsRoot ?? defaults.skillsRoot),
    agentsSkillsRoot: resolveUserPath(config.agentsSkillsRoot ?? defaults.agentsSkillsRoot),
  };
}

export async function ensureBrowserSkillCliConfig(): Promise<string> {
  const configPath = getBrowserSkillConfigPath();

  try {
    await readFile(configPath, "utf8");
    return configPath;
  } catch {
    await saveBrowserSkillCliConfig(getDefaultBrowserSkillCliConfig());
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
