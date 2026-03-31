import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { SkillDefinition } from "@browser-skill/core";
import {
  LOCAL_CORE_PACKAGE_PATH,
  LOCAL_TEMPLATE_PACKAGE_PATH,
  getDefaultSkillsRoot,
} from "./constants";
import { runNpmAndCapture } from "./npm";

export interface SkillPackageJson {
  name?: string;
  bin?: string | Record<string, string>;
  browserSkill?: boolean | Record<string, unknown>;
}

export async function initSkillProject(
  skillName: string,
  cliName = skillName,
  targetRoot?: string,
): Promise<string> {
  const resolvedTargetRoot = targetRoot ?? (await getDefaultSkillsRoot());
  const targetDir = path.join(resolvedTargetRoot, skillName);
  await runNpmAndCapture(
    [
      "exec",
      "--yes",
      "--package",
      `file:${LOCAL_TEMPLATE_PACKAGE_PATH}`,
      "--",
      "browser-skill-create-template",
      "--template",
      "basic",
      "--skill-name",
      skillName,
      "--cli-name",
      cliName,
      "--target-dir",
      targetDir,
      "--core-package-path",
      LOCAL_CORE_PACKAGE_PATH,
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
  return rawName.startsWith("browser-skill-")
    ? rawName.slice("browser-skill-".length)
    : rawName;
}

export async function ensureValidSkillProject(
  projectDir: string,
): Promise<{ packageName: string; skillName: string; bins: Record<string, string> }> {
  const packageJson = await loadSkillPackageJson(projectDir);
  if (!packageJson.browserSkill) {
    throw new Error(`Missing browserSkill field in ${path.join(projectDir, "package.json")}`);
  }

  if (typeof packageJson.name !== "string" || packageJson.name.length === 0) {
    throw new Error(`Missing package name in ${path.join(projectDir, "package.json")}`);
  }

  const skillFilePath = path.join(projectDir, "skill", "SKILL.md");
  await readFile(skillFilePath, "utf8");

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
  const previousCwd = process.cwd();

  try {
    process.chdir(projectDir);
    const imported = await import(pathToFileURL(entryPath).href);
    const skill = (imported.default ?? imported.skill) as SkillDefinition | undefined;

    if (!skill) {
      throw new Error(`Cannot find exported skill definition in ${entryPath}`);
    }

    return skill.rootDir
      ? skill
      : {
          ...skill,
          rootDir: projectDir,
        };
  } finally {
    process.chdir(previousCwd);
  }
}
