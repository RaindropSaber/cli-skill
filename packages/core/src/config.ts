import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnySkill, BrowserSkillConfig } from "./types";

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
  return path.join(os.homedir(), ".cli-skill");
}

export function getBrowserSkillConfigPath(): string {
  return path.join(getBrowserSkillHome(), "config.json");
}

export async function loadBrowserSkillConfig(): Promise<BrowserSkillConfig> {
  try {
    const raw = await readFile(getBrowserSkillConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as BrowserSkillConfig;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function getDefaultBrowserSkillConfig(): Required<
  Pick<BrowserSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "skillConfig">
> {
  return {
    skillsRoot: path.join(getBrowserSkillHome(), "skills"),
    agentsSkillsRoot: path.join(os.homedir(), ".agents", "skills"),
    skillConfig: {},
  };
}

export async function saveBrowserSkillConfig(config: BrowserSkillConfig): Promise<void> {
  const configPath = getBrowserSkillConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function getResolvedBrowserSkillConfig(): Promise<Required<Pick<BrowserSkillConfig, "skillsRoot" | "agentsSkillsRoot">> & BrowserSkillConfig> {
  const config = await loadBrowserSkillConfig();
  const defaults = getDefaultBrowserSkillConfig();

  return {
    ...config,
    skillConfig: config.skillConfig ?? defaults.skillConfig,
    skillsRoot: resolveUserPath(config.skillsRoot ?? defaults.skillsRoot),
    agentsSkillsRoot: resolveUserPath(config.agentsSkillsRoot ?? defaults.agentsSkillsRoot),
  };
}

export async function ensureSkillConfigEntry(skill: AnySkill): Promise<void> {
  const config = await loadBrowserSkillConfig();
  const nextConfig: BrowserSkillConfig = {
    ...getDefaultBrowserSkillConfig(),
    ...config,
    skillConfig: {
      ...(config.skillConfig ?? {}),
    },
  };

  if (!nextConfig.skillConfig?.[skill.name]) {
    nextConfig.skillConfig![skill.name] = {};
    await saveBrowserSkillConfig(nextConfig);
  }
}
