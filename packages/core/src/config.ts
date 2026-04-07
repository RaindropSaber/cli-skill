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
  Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserUserDataDir" | "browserSourceUserDataDir" | "skillConfig">
> {
  const systemChromeSourceUserDataDir =
    process.platform === "darwin"
      ? path.join(getUserHome(), "Library", "Application Support", "Google", "Chrome", "Default")
      : "";
  return {
    skillsRoot: path.join(getBrowserSkillHome(), "skills"),
    agentsSkillsRoot: path.join(getUserHome(), ".agents", "skills"),
    browserExecutablePath: "",
    browserUserDataDir: path.join(getBrowserSkillHome(), "browser", "user-data"),
    browserSourceUserDataDir: systemChromeSourceUserDataDir,
    skillConfig: {},
  };
}

export async function saveBrowserSkillConfig(config: CliSkillConfig): Promise<void> {
  const configPath = getBrowserSkillConfigPath();
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function getResolvedBrowserSkillConfig(): Promise<Required<Pick<CliSkillConfig, "skillsRoot" | "agentsSkillsRoot" | "browserExecutablePath" | "browserUserDataDir" | "browserSourceUserDataDir">> & CliSkillConfig> {
  const config = await loadBrowserSkillConfig();
  const defaults = getDefaultBrowserSkillConfig();

  return {
    ...config,
    skillConfig: config.skillConfig ?? defaults.skillConfig,
    skillsRoot: resolveUserPath(config.skillsRoot ?? defaults.skillsRoot),
    agentsSkillsRoot: resolveUserPath(config.agentsSkillsRoot ?? defaults.agentsSkillsRoot),
    browserExecutablePath: resolveUserPath(config.browserExecutablePath ?? defaults.browserExecutablePath),
    browserUserDataDir: resolveUserPath(config.browserUserDataDir ?? defaults.browserUserDataDir),
    browserSourceUserDataDir: resolveUserPath(config.browserSourceUserDataDir ?? defaults.browserSourceUserDataDir),
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
