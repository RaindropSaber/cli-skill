import path from "node:path";
import { getResolvedBrowserSkillCliConfig } from "./config";

export const LOCAL_CORE_PACKAGE_PATH = path.resolve(import.meta.dirname, "../../core");
export const LOCAL_TEMPLATE_PACKAGE_PATH = path.resolve(import.meta.dirname, "../../templates");
export const DEFAULT_TEMPLATE_NAME = "basic";

export async function getDefaultSkillsRoot(): Promise<string> {
  const config = await getResolvedBrowserSkillCliConfig();
  return config.skillsRoot;
}

export async function getInstalledSkillsRoot(): Promise<string> {
  const config = await getResolvedBrowserSkillCliConfig();
  return config.installedSkillsRoot;
}

export async function getAgentsSkillsRoot(): Promise<string> {
  const config = await getResolvedBrowserSkillCliConfig();
  return config.agentsSkillsRoot;
}
