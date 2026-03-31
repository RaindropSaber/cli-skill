import type { CAC } from "cac";
import { getLocalSkillProjectDir, setupLocalSkill } from "../registry";

export function registerEnableCommand(cli: CAC): void {
  cli
    .command("enable <skillName>", "Enable a local skill for use")
    .option("--agentPath <agentPath>", "Override the target agent skill directory")
    .action(async (skillName: string, options: { agentPath?: string }) => {
      const projectDir = await getLocalSkillProjectDir(skillName);
      const targetPath = await setupLocalSkill(projectDir, { skillRoot: options.agentPath });
      console.log(targetPath);
    });
}
