import type { CAC } from "cac";
import path from "node:path";
import { installPackageToDirectory } from "../bun";
import { getDefaultSkillsRoot } from "../constants";
import { registerInstalledSkillProject, setupLocalSkillBins } from "../registry";
import { getSkillNameFromPackageName } from "../project";

interface InstallCommandDeps {
  getDefaultSkillsRoot: typeof getDefaultSkillsRoot;
  installPackageToDirectory: typeof installPackageToDirectory;
  registerInstalledSkillProject: typeof registerInstalledSkillProject;
  setupLocalSkillBins: typeof setupLocalSkillBins;
}

const defaultDeps: InstallCommandDeps = {
  getDefaultSkillsRoot,
  installPackageToDirectory,
  registerInstalledSkillProject,
  setupLocalSkillBins,
};

export function createInstallSkillHandler(deps: InstallCommandDeps = defaultDeps) {
  return async (packageName: string, options: { registry?: string }) => {
    const skillName = getSkillNameFromPackageName(packageName);
    const skillsRoot = await deps.getDefaultSkillsRoot();
    const installDir = path.join(skillsRoot, skillName);
    await deps.installPackageToDirectory(packageName, installDir, options.registry);
    const packageDir = path.join(installDir, "node_modules", packageName);
    await deps.registerInstalledSkillProject(packageDir);
    await deps.setupLocalSkillBins(packageDir);
    console.log(packageDir);
  };
}

export function registerInstallCommand(cli: CAC): void {
  cli
    .command("install <packageName>", "Install a cli skill package into cli-skill managed storage")
    .alias("i")
    .option("--registry <registry>", "Install from a specific package registry")
    .action(createInstallSkillHandler());
}
