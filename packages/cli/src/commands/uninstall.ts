import type { CAC } from "cac";
import { rm } from "node:fs/promises";
import path from "node:path";
import { resolveRegisteredSkillProject, removeRegistryEntry, unregisterProjectBins } from "../registry";
import { getDefaultSkillsRoot } from "../constants";

function getInstalledSkillRoot(projectPath: string): string {
  const segments = projectPath.split(path.sep);
  const nodeModulesIndex = segments.lastIndexOf("node_modules");
  if (nodeModulesIndex === -1) {
    return projectPath;
  }

  return segments.slice(0, nodeModulesIndex).join(path.sep) || path.sep;
}

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
      if (resolved.source === "installed") {
        const installRoot = getInstalledSkillRoot(resolved.projectPath);
        const skillsRoot = await getDefaultSkillsRoot();
        const normalized = path.resolve(installRoot);
        if (!normalized.startsWith(path.resolve(skillsRoot) + path.sep)) {
          throw new Error(
            `Refusing to delete "${normalized}" — it is outside the managed skills directory "${skillsRoot}". ` +
              `Only directories under the managed root can be removed by uninstall.`,
          );
        }
        await rm(installRoot, { recursive: true, force: true });
      }
      await removeRegistryEntry(skillName);
      console.log(resolved.projectPath);
    });
}
