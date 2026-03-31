import type { CAC } from "cac";
import { getLocalSkillProjectDir, removeLocalSkill } from "../registry";

export function registerDisableCommand(cli: CAC): void {
  cli
    .command("disable <skillName>", "Disable a local skill")
    .option("--agentPath <agentPath>", "Override the target agent skill directory")
    .action(async (skillName: string, options: { agentPath?: string }) => {
      const projectDir = await getLocalSkillProjectDir(skillName);
      const targetPath = await removeLocalSkill(projectDir, { skillRoot: options.agentPath });
      console.log(targetPath);
    });
}
