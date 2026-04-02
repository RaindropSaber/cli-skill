import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { getAgentsSkillsRoot, getDefaultSkillsRoot } from "./constants";
import { getBrowserSkillHome } from "./config";
import { getBunGlobalBinDir } from "./bun";
import { ensureValidSkillProject } from "./project";

export interface RegisteredSkillEntry {
  skillName: string;
  packageName: string;
  source: "local" | "installed";
  projectPath: string;
  binNames: string[];
  agentPaths: string[];
}

interface SkillRegistryFile {
  skills: Record<string, RegisteredSkillEntry>;
}

export interface ResolvedSkillProject {
  source: "local" | "installed";
  skillName: string;
  packageName: string;
  projectPath: string;
  binNames: string[];
  agentPaths: string[];
}

interface SetupOptions {
  skillRoot?: string;
}

function getRegistryPath(): string {
  return path.join(getBrowserSkillHome(), "registry.json");
}

async function loadRegistryFile(): Promise<SkillRegistryFile> {
  try {
    const raw = await readFile(getRegistryPath(), "utf8");
    const parsed = JSON.parse(raw) as SkillRegistryFile;
    return { skills: parsed.skills ?? {} };
  } catch {
    return { skills: {} };
  }
}

async function saveRegistryFile(registry: SkillRegistryFile): Promise<void> {
  const registryPath = getRegistryPath();
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

async function ensureSymlink(sourcePath: string, targetPath: string, type: "file" | "dir"): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
  await symlink(sourcePath, targetPath, type);
}

async function setupBins(projectDir: string, bins: Record<string, string>): Promise<string[]> {
  const globalBinDir = await getBunGlobalBinDir();
  await mkdir(globalBinDir, { recursive: true });

  const installedBinNames: string[] = [];

  for (const [binName, relativeBinPath] of Object.entries(bins)) {
    const sourcePath = path.resolve(projectDir, relativeBinPath);
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

async function validateRegistryEntry(entry: RegisteredSkillEntry): Promise<RegisteredSkillEntry | null> {
  if (!existsSync(entry.projectPath)) {
    return null;
  }

  try {
    const { packageName, skillName, bins } = await ensureValidSkillProject(entry.projectPath);
    const nextAgentPaths = entry.agentPaths.filter((agentPath) => existsSync(agentPath));

    return {
      ...entry,
      packageName,
      skillName,
      binNames: Object.keys(bins),
      agentPaths: nextAgentPaths,
    };
  } catch {
    return null;
  }
}

async function loadCleanRegistry(): Promise<SkillRegistryFile> {
  const registry = await loadRegistryFile();
  const nextSkills: Record<string, RegisteredSkillEntry> = {};
  let changed = false;

  for (const [skillName, entry] of Object.entries(registry.skills)) {
    const validated = await validateRegistryEntry(entry);
    if (!validated) {
      changed = true;
      continue;
    }

    nextSkills[skillName] = validated;
    if (JSON.stringify(validated) !== JSON.stringify(entry)) {
      changed = true;
    }
  }

  const nextRegistry = { skills: nextSkills };
  if (changed) {
    await saveRegistryFile(nextRegistry);
  }

  return nextRegistry;
}

async function upsertRegistryEntry(entry: RegisteredSkillEntry): Promise<void> {
  const registry = await loadCleanRegistry();
  registry.skills[entry.skillName] = entry;
  await saveRegistryFile(registry);
}

export async function removeRegistryEntry(skillName: string): Promise<void> {
  const registry = await loadCleanRegistry();
  delete registry.skills[skillName];
  await saveRegistryFile(registry);
}

export async function registerLocalSkillProject(projectDir: string): Promise<RegisteredSkillEntry> {
  const { packageName, skillName, bins } = await ensureValidSkillProject(projectDir);
  const binNames = await setupBins(projectDir, bins);
  const entry: RegisteredSkillEntry = {
    skillName,
    packageName,
    source: "local",
    projectPath: projectDir,
    binNames,
    agentPaths: [],
  };
  await upsertRegistryEntry(entry);
  return entry;
}

export async function registerInstalledSkillProject(projectDir: string): Promise<RegisteredSkillEntry> {
  const { packageName, skillName, bins } = await ensureValidSkillProject(projectDir);
  const entry: RegisteredSkillEntry = {
    skillName,
    packageName,
    source: "installed",
    projectPath: projectDir,
    binNames: Object.keys(bins),
    agentPaths: [],
  };
  await upsertRegistryEntry(entry);
  return entry;
}

export async function setupLocalSkillBins(projectDir: string): Promise<string[]> {
  const { skillName, packageName, bins } = await ensureValidSkillProject(projectDir);
  const binNames = await setupBins(projectDir, bins);
  const registry = await loadCleanRegistry();
  const current = registry.skills[skillName];
  registry.skills[skillName] = {
    skillName,
    packageName,
    source: current?.source ?? "local",
    projectPath: projectDir,
    binNames,
    agentPaths: current?.agentPaths ?? [],
  };
  await saveRegistryFile(registry);
  return binNames;
}

export async function mountSkillProject(projectDir: string, options: SetupOptions = {}): Promise<string> {
  const { skillName, packageName, bins } = await ensureValidSkillProject(projectDir);
  const agentsSkillsRoot = options.skillRoot ?? (await getAgentsSkillsRoot());
  const targetPath = path.join(agentsSkillsRoot, skillName);
  const generatedSkillDir = getGeneratedSkillDir(projectDir);

  await mkdir(agentsSkillsRoot, { recursive: true });
  const binNames = await setupBins(projectDir, bins);
  await readFile(path.join(generatedSkillDir, "SKILL.md"), "utf8");
  await ensureSymlink(generatedSkillDir, targetPath, "dir");

  const registry = await loadCleanRegistry();
  const current = registry.skills[skillName];
  const currentAgentPaths = current?.agentPaths ?? [];
  const nextAgentPaths = Array.from(new Set([...currentAgentPaths.filter((item) => item !== targetPath), targetPath]));
  registry.skills[skillName] = {
    skillName,
    packageName,
    source: current?.source ?? "local",
    projectPath: projectDir,
    binNames,
    agentPaths: nextAgentPaths,
  };
  await saveRegistryFile(registry);

  return targetPath;
}

export async function unmountSkillProject(projectDir: string, options: SetupOptions = {}): Promise<string> {
  const { skillName } = await ensureValidSkillProject(projectDir);
  const agentsSkillsRoot = options.skillRoot ?? (await getAgentsSkillsRoot());
  const targetPath = path.join(agentsSkillsRoot, skillName);

  await rm(targetPath, { recursive: true, force: true });
  const registry = await loadCleanRegistry();
  const entry = registry.skills[skillName];
  if (entry) {
    registry.skills[skillName] = {
      ...entry,
      agentPaths: entry.agentPaths.filter((item) => item !== targetPath),
    };
    await saveRegistryFile(registry);
  }

  return targetPath;
}

export async function unregisterProjectBins(projectDir: string): Promise<void> {
  const { bins } = await ensureValidSkillProject(projectDir);
  await removeBins(Object.keys(bins));
}

export async function listRegisteredSkills(): Promise<RegisteredSkillEntry[]> {
  const registry = await loadCleanRegistry();
  return Object.values(registry.skills).sort((a, b) => a.skillName.localeCompare(b.skillName));
}

export async function resolveRegisteredSkillProject(skillName: string): Promise<ResolvedSkillProject> {
  const registry = await loadCleanRegistry();
  const entry = registry.skills[skillName];
  if (!entry) {
    throw new Error(`Unknown cli skill "${skillName}".`);
  }

  return {
    source: entry.source,
    skillName: entry.skillName,
    packageName: entry.packageName,
    projectPath: entry.projectPath,
    binNames: entry.binNames,
    agentPaths: entry.agentPaths,
  };
}

export async function getCurrentSkillProject(): Promise<ResolvedSkillProject> {
  const projectPath = process.cwd();
  const { packageName, skillName, bins } = await ensureValidSkillProject(projectPath);
  const registry = await loadCleanRegistry();
  const entry = registry.skills[skillName];

  return {
    source: entry?.source ?? "local",
    skillName,
    packageName,
    projectPath,
    binNames: Object.keys(bins),
    agentPaths: entry?.agentPaths ?? [],
  };
}
