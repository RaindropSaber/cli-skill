import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AnySkill, CliSkillConfig } from "./types";

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

export async function loadBrowserSkillConfig(): Promise<CliSkillConfig> {
  try {
    const raw = await readFile(getBrowserSkillConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as CliSkillConfig;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function getDefaultBrowserSkillConfig(): Required<
  Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserStorageRoot" | "browserProfileRoot" | "skillConfig">
> {
  return {
    skillsRoot: path.join(getBrowserSkillHome(), "skills"),
    agentsSkillsRoot: path.join(getUserHome(), ".agents", "skills"),
    browserStorageRoot: path.join(getBrowserSkillHome(), "browser", "storage"),
    browserProfileRoot: path.join(getBrowserSkillHome(), "browser", "profile"),
    skillConfig: {},
  };
}

export async function saveBrowserSkillConfig(config: CliSkillConfig): Promise<void> {
  const configPath = getBrowserSkillConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function getResolvedBrowserSkillConfig(): Promise<Required<Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserStorageRoot" | "browserProfileRoot">> & CliSkillConfig> {
  const config = await loadBrowserSkillConfig();
  const defaults = getDefaultBrowserSkillConfig();

  return {
    ...config,
    skillConfig: config.skillConfig ?? defaults.skillConfig,
    skillsRoot: resolveUserPath(config.skillsRoot ?? defaults.skillsRoot),
    agentsSkillsRoot: resolveUserPath(config.agentsSkillsRoot ?? defaults.agentsSkillsRoot),
    browserStorageRoot: resolveUserPath(config.browserStorageRoot ?? defaults.browserStorageRoot),
    browserProfileRoot: resolveUserPath(config.browserProfileRoot ?? defaults.browserProfileRoot),
  };
}

export async function ensureSkillConfigEntry(skill: AnySkill): Promise<void> {
  const config = await loadBrowserSkillConfig();
  const nextConfig: CliSkillConfig = {
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
