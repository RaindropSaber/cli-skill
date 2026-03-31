import type { CAC } from "cac";
import { initSkillProject } from "../project";

export function registerInitCommand(cli: CAC): void {
  cli
    .command("init <skillName>", "Initialize a browser skill project")
    .option("--cli-name <cliName>", "Override the generated CLI name")
    .action(async (skillName: string, options: { cliName?: string }) => {
      const targetDir = await initSkillProject(skillName, options.cliName ?? skillName);
      console.log(targetDir);
    });
}
