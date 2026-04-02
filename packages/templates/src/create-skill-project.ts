import { chmod, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

interface CreateSkillProjectOptions {
  templateName: string;
  skillName: string;
  cliName: string;
  targetDir: string;
  corePackageSpec: string;
}

function toPackageName(skillName: string): string {
  return `cli-skill-${skillName}`;
}

function render(template: string, options: CreateSkillProjectOptions): string {
  return template
    .replaceAll("__SKILL_NAME__", options.skillName)
    .replaceAll("__CLI_NAME__", options.cliName)
    .replaceAll("__CORE_PACKAGE_SPEC__", options.corePackageSpec)
    .replaceAll("__PACKAGE_NAME__", toPackageName(options.skillName));
}

function renderPath(inputPath: string, options: CreateSkillProjectOptions): string {
  return inputPath
    .replaceAll("__SKILL_NAME__", options.skillName)
    .replaceAll("__CLI_NAME__", options.cliName);
}

async function copyTemplateDirectory(
  sourceDir: string,
  targetDir: string,
  options: CreateSkillProjectOptions,
): Promise<void> {
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const renderedName = renderPath(entry.name, options);
    const targetPath = path.join(targetDir, renderedName);

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyTemplateDirectory(sourcePath, targetPath, options);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const template = await readFile(sourcePath, "utf8");
    await writeFile(targetPath, render(template, options), "utf8");
  }
}

export async function createSkillProject(options: CreateSkillProjectOptions): Promise<string> {
  const templateRoot = path.resolve(import.meta.dirname, `../${options.templateName}`);
  const templateStat = await stat(templateRoot);
  if (!templateStat.isDirectory()) {
    throw new Error(`Template directory not found: ${templateRoot}`);
  }

  await mkdir(options.targetDir, { recursive: true });
  await copyTemplateDirectory(templateRoot, options.targetDir, options);

  const binPath = path.join(options.targetDir, "bin", options.cliName);
  await chmod(binPath, 0o755);

  return options.targetDir;
}
