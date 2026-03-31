import type { CAC } from "cac";
import { removeManagedSkill } from "../registry";

export function registerUninstallCommand(cli: CAC): void {
  cli
    .command("uninstall <packageName>", "Uninstall a managed cli skill")
    .option("--skill-root <skillRoot>", "Override the target skill registration directory")
    .action(async (packageName: string, options: { skillRoot?: string }) => {
      const targetPath = await removeManagedSkill(packageName, { skillRoot: options.skillRoot });
      console.log(targetPath);
    });
}
