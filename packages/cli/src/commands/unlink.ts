import type { CAC } from "cac";
import { runNpm } from "../npm";
import { ensureValidSkillProject } from "../project";
import { unregisterSkillByName } from "../registry";

export function registerUnlinkCommand(cli: CAC): void {
  cli.command("unlink", "Unlink the current local skill project").action(async () => {
    const projectDir = process.cwd();
    const { skillName, packageName } = await ensureValidSkillProject(projectDir);
    await runNpm(["unlink", "-g", packageName], projectDir);
    const targetPath = await unregisterSkillByName(skillName);
    console.log(targetPath);
  });
}
