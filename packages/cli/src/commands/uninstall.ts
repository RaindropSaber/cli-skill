import type { CAC } from "cac";
import { runNpm } from "../npm";
import { getSkillNameFromPackageName } from "../project";
import { unregisterSkillByName } from "../registry";

export function registerUninstallCommand(cli: CAC): void {
  cli.command("uninstall <packageName>", "Uninstall a published browser skill globally").action(
    async (packageName: string) => {
      await runNpm(["uninstall", "-g", packageName]);
      const skillName = getSkillNameFromPackageName(packageName);
      const targetPath = await unregisterSkillByName(skillName);
      console.log(targetPath);
    },
  );
}
