import { mkdir, rm, symlink } from "node:fs/promises";
import path from "node:path";
import { getAgentsSkillsRoot } from "./constants";
import { ensureValidSkillProject } from "./project";

export async function registerSkill(projectDir: string): Promise<string> {
  const { skillName } = await ensureValidSkillProject(projectDir);
  const sourcePath = path.join(projectDir, "skill");
  const agentsSkillsRoot = await getAgentsSkillsRoot();
  const targetPath = path.join(agentsSkillsRoot, skillName);

  await mkdir(agentsSkillsRoot, { recursive: true });
  await rm(targetPath, { recursive: true, force: true });
  await symlink(sourcePath, targetPath, "dir");

  return targetPath;
}

export async function unregisterSkillByName(skillName: string): Promise<string> {
  const agentsSkillsRoot = await getAgentsSkillsRoot();
  const targetPath = path.join(agentsSkillsRoot, skillName);
  await rm(targetPath, { recursive: true, force: true });
  return targetPath;
}
