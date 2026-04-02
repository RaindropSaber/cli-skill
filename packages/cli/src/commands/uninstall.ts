import type { CAC } from "cac";
import { rm } from "node:fs/promises";
import path from "node:path";
import { resolveRegisteredSkillProject, removeRegistryEntry, unregisterProjectBins } from "../registry";

export function registerUninstallCommand(cli: CAC): void {
  cli
    .command("uninstall <packageName>", "Uninstall a managed cli skill")
    .action(async (packageName: string) => {
      const skillName = packageName.split("/").at(-1)?.replace(/^cli-skill-/, "") ?? packageName;
      const resolved = await resolveRegisteredSkillProject(skillName);
      await unregisterProjectBins(resolved.projectPath);
      for (const agentPath of resolved.agentPaths) {
        await rm(agentPath, { recursive: true, force: true });
      }
      await rm(path.join(resolved.projectPath, "..", ".."), { recursive: true, force: true });
      await removeRegistryEntry(skillName);
      console.log(resolved.projectPath);
    });
}
