import type { CAC } from "cac";
import { runNpm } from "../npm";
import { ensureValidSkillProject } from "../project";
import { registerSkill } from "../registry";

export function registerLinkCommand(cli: CAC): void {
  cli.command("link", "Link the current local skill project for development").action(async () => {
    const projectDir = process.cwd();
    await ensureValidSkillProject(projectDir);
    await runNpm(["link"], projectDir);
    const targetPath = await registerSkill(projectDir);
    console.log(targetPath);
  });
}
