import { mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAgentsSkillsRoot, getDefaultSkillsRoot, getInstalledSkillsRoot } from "./constants";
import { ensureValidSkillProject, getSkillNameFromPackageName, type SkillPackageJson } from "./project";
import { getBunGlobalBinDir } from "./bun";

interface SetupOptions {
  skillRoot?: string;
}

interface RegisteredSkillInfo {
  skillName: string;
  packageName: string;
  sourcePath: string;
  skillPath: string;
  binNames: string[];
}

interface InstalledSkillMetadata {
  packageName: string;
  packageSpec: string;
}

export interface ResolvedSkillProject {
  source: "local" | "remote";
  skillName: string;
  packageName: string;
  projectPath: string;
}

function installedPackageDirName(packageName: string): string {
  return packageName.replaceAll("/", "__");
}

async function ensureSymlink(sourcePath: string, targetPath: string, type: "file" | "dir"): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
  await symlink(sourcePath, targetPath, type);
}

async function loadPackageJson(packageDir: string): Promise<SkillPackageJson> {
  return JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8")) as SkillPackageJson;
}

function resolveBinEntries(
  packageName: string,
  bin: SkillPackageJson["bin"],
): Record<string, string> {
  if (typeof bin === "string") {
    return { [getSkillNameFromPackageName(packageName)]: bin };
  }

  if (bin && typeof bin === "object") {
    return bin;
  }

  return {};
}

async function setupBins(sourceDir: string, bins: Record<string, string>): Promise<string[]> {
  const globalBinDir = await getBunGlobalBinDir();
  await mkdir(globalBinDir, { recursive: true });

  const installedBinNames: string[] = [];

  for (const [binName, relativeBinPath] of Object.entries(bins)) {
    const sourcePath = path.resolve(sourceDir, relativeBinPath);
    const targetPath = path.join(globalBinDir, binName);
    await ensureSymlink(sourcePath, targetPath, "file");
    installedBinNames.push(binName);
  }

  return installedBinNames;
}

async function removeBins(binNames: string[]): Promise<void> {
  const globalBinDir = await getBunGlobalBinDir();
  for (const binName of binNames) {
    await rm(path.join(globalBinDir, binName), { force: true });
  }
}

function getGeneratedSkillDir(projectDir: string): string {
  return path.join(projectDir, "skill");
}

export async function setupLocalSkill(projectDir: string, options: SetupOptions = {}): Promise<string> {
  const { skillName, bins } = await ensureValidSkillProject(projectDir);
  const agentsSkillsRoot = options.skillRoot ?? (await getAgentsSkillsRoot());
  const targetPath = path.join(agentsSkillsRoot, skillName);
  const generatedSkillDir = getGeneratedSkillDir(projectDir);

  await mkdir(agentsSkillsRoot, { recursive: true });
  await setupBins(projectDir, bins);
  await readFile(path.join(generatedSkillDir, "SKILL.md"), "utf8");
  await ensureSymlink(generatedSkillDir, targetPath, "dir");

  return targetPath;
}

export async function mountSkillProject(projectDir: string, options: SetupOptions = {}): Promise<string> {
  return setupLocalSkill(projectDir, options);
}

export async function removeLocalSkill(projectDir: string, options: SetupOptions = {}): Promise<string> {
  const { skillName, bins } = await ensureValidSkillProject(projectDir);
  const agentsSkillsRoot = options.skillRoot ?? (await getAgentsSkillsRoot());
  const targetPath = path.join(agentsSkillsRoot, skillName);

  await removeBins(Object.keys(bins));
  await rm(targetPath, { recursive: true, force: true });

  return targetPath;
}

export async function unmountSkillProject(projectDir: string, options: SetupOptions = {}): Promise<string> {
  return removeLocalSkill(projectDir, options);
}

export async function installManagedSkill(
  packageName: string,
  packageSpec: string,
  packageDir: string,
  options: SetupOptions = {},
): Promise<string> {
  const packageJson = await loadPackageJson(packageDir);
  if (!packageJson.cliSkill) {
    throw new Error(`Missing cliSkill field in ${path.join(packageDir, "package.json")}`);
  }

  const skillName = getSkillNameFromPackageName(packageName);
  const bins = resolveBinEntries(packageName, packageJson.bin);
  const agentsSkillsRoot = options.skillRoot ?? (await getAgentsSkillsRoot());
  const targetPath = path.join(agentsSkillsRoot, skillName);
  const installedSkillsRoot = await getInstalledSkillsRoot();
  const metadataPath = path.join(installedSkillsRoot, installedPackageDirName(packageName), ".cli-skill.json");
  const generatedSkillDir = path.join(packageDir, "skill");

  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify({ packageName, packageSpec }, null, 2)}\n`, "utf8");
  await mkdir(agentsSkillsRoot, { recursive: true });
  await setupBins(packageDir, bins);
  await readFile(path.join(generatedSkillDir, "SKILL.md"), "utf8");
  await ensureSymlink(generatedSkillDir, targetPath, "dir");

  return targetPath;
}

export async function removeManagedSkill(packageName: string, options: SetupOptions = {}): Promise<string> {
  const installedSkillsRoot = await getInstalledSkillsRoot();
  const installDir = path.join(installedSkillsRoot, installedPackageDirName(packageName));
  const packageDir = path.join(installDir, "node_modules", packageName);
  const packageJson = await loadPackageJson(packageDir);
  const bins = resolveBinEntries(packageName, packageJson.bin);
  const skillName = getSkillNameFromPackageName(packageName);
  const agentsSkillsRoot = options.skillRoot ?? (await getAgentsSkillsRoot());
  const targetPath = path.join(agentsSkillsRoot, skillName);

  await removeBins(Object.keys(bins));
  await rm(targetPath, { recursive: true, force: true });
  await rm(installDir, { recursive: true, force: true });

  return targetPath;
}

export async function getRegisteredAgentSkillNames(skillRoot?: string): Promise<Set<string>> {
  const agentsSkillsRoot = skillRoot ?? (await getAgentsSkillsRoot());
  try {
    const names = await readdir(agentsSkillsRoot);
    return new Set(names);
  } catch {
    return new Set();
  }
}

export async function listBrowserSkills(): Promise<
  Array<{
    source: "local" | "remote";
    skillName: string;
    packageName: string;
    projectPath: string;
    active: boolean;
    agentPaths: string[];
  }>
> {
  const agentsSkillsRoot = await getAgentsSkillsRoot();
  const activeSkills = await getRegisteredAgentSkillNames(agentsSkillsRoot);
  const results: Array<{
    source: "local" | "remote";
    skillName: string;
    packageName: string;
    projectPath: string;
    active: boolean;
    agentPaths: string[];
  }> = [];

  const skillsRoot = await getDefaultSkillsRoot();
  try {
    for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const projectDir = path.join(skillsRoot, entry.name);
      try {
        const { skillName, packageName } = await ensureValidSkillProject(projectDir);
        results.push({
          source: "local",
          skillName,
          packageName,
          projectPath: projectDir,
          active: activeSkills.has(skillName),
          agentPaths: activeSkills.has(skillName) ? [path.join(agentsSkillsRoot, skillName)] : [],
        });
      } catch {}
    }
  } catch {}

  const installedSkillsRoot = await getInstalledSkillsRoot();
  try {
    for (const entry of await readdir(installedSkillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const installDir = path.join(installedSkillsRoot, entry.name);
      const metadataPath = path.join(installDir, ".cli-skill.json");
      try {
        const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as InstalledSkillMetadata;
        const skillName = getSkillNameFromPackageName(metadata.packageName);
        results.push({
          source: "remote",
          skillName,
          packageName: metadata.packageName,
          projectPath: path.join(installDir, "node_modules", metadata.packageName),
          active: activeSkills.has(skillName),
          agentPaths: activeSkills.has(skillName) ? [path.join(agentsSkillsRoot, skillName)] : [],
        });
      } catch {}
    }
  } catch {}

  return results.sort((a, b) => a.source.localeCompare(b.source) || a.skillName.localeCompare(b.skillName));
}

export async function getLocalSkillProjectDir(skillName: string): Promise<string> {
  const skillsRoot = await getDefaultSkillsRoot();
  return path.join(skillsRoot, skillName);
}

export async function resolveSkillProject(skillName: string): Promise<ResolvedSkillProject> {
  const localProjectPath = await getLocalSkillProjectDir(skillName);
  try {
    const { packageName } = await ensureValidSkillProject(localProjectPath);
    return {
      source: "local",
      skillName,
      packageName,
      projectPath: localProjectPath,
    };
  } catch {}

  const installedSkillsRoot = await getInstalledSkillsRoot();
  try {
    for (const entry of await readdir(installedSkillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const installDir = path.join(installedSkillsRoot, entry.name);
      const metadataPath = path.join(installDir, ".cli-skill.json");
      try {
        const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as InstalledSkillMetadata;
        if (getSkillNameFromPackageName(metadata.packageName) !== skillName) {
          continue;
        }

        return {
          source: "remote",
          skillName,
          packageName: metadata.packageName,
          projectPath: path.join(installDir, "node_modules", metadata.packageName),
        };
      } catch {}
    }
  } catch {}

  throw new Error(`Unknown cli skill "${skillName}".`);
}
