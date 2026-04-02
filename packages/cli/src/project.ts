import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { SkillDefinition } from "@cli-skill/core";
import {
  DEFAULT_TEMPLATE_NAME,
  hasLocalTemplatesPackage,
  LOCAL_TEMPLATE_PACKAGE_PATH,
} from "./constants";
import { runBunx } from "./bun";

export interface SkillPackageJson {
  name?: string;
  bin?: string | Record<string, string>;
  cliSkill?: boolean | Record<string, unknown>;
  version?: string;
}

async function importSkillDefinition(entryPath: string): Promise<SkillDefinition> {
  const previousCwd = process.cwd();

  try {
    process.chdir(path.resolve(path.dirname(entryPath), ".."));
    const imported = await import(pathToFileURL(entryPath).href);
    const skill = (imported.default ?? imported.skill) as SkillDefinition | undefined;

    if (!skill) {
      throw new Error(`Cannot find exported skill definition in ${entryPath}`);
    }

    return skill;
  } finally {
    process.chdir(previousCwd);
  }
}

async function getCliPackageVersion(): Promise<string> {
  const cliPackageJsonPath = path.resolve(import.meta.dirname, "..", "package.json");
  const cliPackageJson = JSON.parse(await readFile(cliPackageJsonPath, "utf8")) as SkillPackageJson;

  if (typeof cliPackageJson.version !== "string" || cliPackageJson.version.length === 0) {
    throw new Error(`Missing version in ${cliPackageJsonPath}`);
  }

  return cliPackageJson.version;
}

export async function createSkillProject(
  skillName: string,
  cliName = skillName,
  templateName = DEFAULT_TEMPLATE_NAME,
  targetRoot?: string,
): Promise<string> {
  const resolvedTargetRoot = targetRoot ?? process.cwd();
  const targetDir = path.join(resolvedTargetRoot, skillName);
  const usingLocalTemplates = await hasLocalTemplatesPackage();
  const cliPackageVersion = await getCliPackageVersion();
  const corePackageSpec = cliPackageVersion;
  const templatePackageSpec = usingLocalTemplates
    ? `file:${LOCAL_TEMPLATE_PACKAGE_PATH}`
    : `@cli-skill/templates@${cliPackageVersion}`;
  await runBunx(
    [
      "--bun",
      "--package",
      templatePackageSpec,
      "cli-skill-create-template",
      "--template",
      templateName,
      "--skill-name",
      skillName,
      "--cli-name",
      cliName,
      "--target-dir",
      targetDir,
      "--core-package-spec",
      corePackageSpec,
    ],
    process.cwd(),
  );

  return targetDir;
}

export async function loadSkillPackageJson(projectDir: string): Promise<SkillPackageJson> {
  const packageJsonPath = path.join(projectDir, "package.json");
  return JSON.parse(await readFile(packageJsonPath, "utf8")) as SkillPackageJson;
}

export function getSkillNameFromPackageName(packageName: string): string {
  const rawName = packageName.split("/").at(-1) ?? packageName;
  return rawName.startsWith("cli-skill-")
    ? rawName.slice("cli-skill-".length)
    : rawName;
}

export async function ensureValidSkillProject(
  projectDir: string,
): Promise<{ packageName: string; skillName: string; bins: Record<string, string> }> {
  const packageJson = await loadSkillPackageJson(projectDir);
  if (!packageJson.cliSkill) {
    throw new Error(`Missing cliSkill field in ${path.join(projectDir, "package.json")}`);
  }

  if (typeof packageJson.name !== "string" || packageJson.name.length === 0) {
    throw new Error(`Missing package name in ${path.join(projectDir, "package.json")}`);
  }

  const bins =
    typeof packageJson.bin === "string"
      ? { [getSkillNameFromPackageName(packageJson.name)]: packageJson.bin }
      : packageJson.bin && typeof packageJson.bin === "object"
        ? packageJson.bin
        : null;

  if (!bins || Object.keys(bins).length === 0) {
    throw new Error(`Missing bin field in ${path.join(projectDir, "package.json")}`);
  }

  return {
    packageName: packageJson.name,
    skillName: getSkillNameFromPackageName(packageJson.name),
    bins,
  };
}

export async function loadSkillDefinition(projectDir: string): Promise<SkillDefinition> {
  await ensureValidSkillProject(projectDir);
  const entryPath = path.join(projectDir, "src", "index.ts");
  const skill = await importSkillDefinition(entryPath);
  return skill.rootDir
    ? skill
    : {
        ...skill,
        rootDir: projectDir,
      };
}
