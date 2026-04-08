import path from "node:path";
import { access } from "node:fs/promises";
import { getResolvedCliSkillConfig } from "./config";

export const LOCAL_CORE_PACKAGE_PATH = path.resolve(import.meta.dirname, "../../core");
export const LOCAL_TEMPLATE_PACKAGE_PATH = path.resolve(import.meta.dirname, "../../templates");
export const DEFAULT_TEMPLATE_NAME = "basic";

export async function hasLocalTemplatesPackage(): Promise<boolean> {
  try {
    await access(path.join(LOCAL_TEMPLATE_PACKAGE_PATH, "package.json"));
    return true;
  } catch {
    return false;
  }
}

export async function getDefaultSkillsRoot(): Promise<string> {
  const config = await getResolvedCliSkillConfig();
  return config.skillsRoot;
}

export async function getAgentsSkillsRoot(): Promise<string> {
  const config = await getResolvedCliSkillConfig();
  return config.agentsSkillsRoot;
}
