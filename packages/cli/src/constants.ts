import path from "node:path";
import { getResolvedBrowserSkillCliConfig } from "./config";

export const LOCAL_CORE_PACKAGE_PATH = path.resolve(import.meta.dirname, "../../core");
export const LOCAL_TEMPLATE_PACKAGE_PATH = path.resolve(import.meta.dirname, "../../templates");

export async function getDefaultSkillsRoot(): Promise<string> {
  const config = await getResolvedBrowserSkillCliConfig();
  return config.skillsRoot;
}

export async function getAgentsSkillsRoot(): Promise<string> {
  const config = await getResolvedBrowserSkillCliConfig();
  return config.agentsSkillsRoot;
}
