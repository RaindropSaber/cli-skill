import { access, mkdir, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import get from "lodash/get";
import set from "lodash/set";
import path from "node:path";
import { chromium } from "playwright";
import { z } from "zod";
import { getResolvedBrowserSkillConfig } from "./config";
import type { RuntimeOptions, RuntimePaths, SkillConfigAccessor, ToolContext } from "./types";

export function getRuntimePaths(storageRoot = path.join(process.cwd(), "storage")): RuntimePaths {
  return {
    storageRoot,
    authDir: path.join(storageRoot, ".auth"),
    screenshotsDir: path.join(storageRoot, "screenshots"),
    tracesDir: path.join(storageRoot, "traces"),
  };
}

function createSkillConfigAccessor(initialValue: unknown): SkillConfigAccessor {
  const value = structuredClone(initialValue ?? {});

  return {
    value,
    get<T = unknown>(keyPath?: string): T {
      return (keyPath ? get(value, keyPath) : value) as T;
    },
    set(keyPath: string, nextValue: unknown): void {
      set(value as object, keyPath, nextValue);
    },
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function getCurrentSkillName(cwd = process.cwd()): Promise<string | null> {
  try {
    const packageJsonRaw = await readFile(path.join(cwd, "package.json"), "utf8");
    const packageJson = JSON.parse(packageJsonRaw) as { name?: string; browserSkill?: unknown };
    if (!packageJson.browserSkill || !packageJson.name) {
      return null;
    }

    const rawName = packageJson.name.split("/").at(-1) ?? packageJson.name;
    return rawName.startsWith("browser-skill-")
      ? rawName.slice("browser-skill-".length)
      : rawName;
  } catch {
    return null;
  }
}

export async function createRuntime(options: RuntimeOptions = {}): Promise<ToolContext> {
  const config = await getResolvedBrowserSkillConfig();
  const skillName = options.skill?.name ?? (await getCurrentSkillName());
  const skillConfig = skillName ? config.skills?.[skillName] : undefined;
  const env = {
    ...(config.env ?? {}),
    ...(skillConfig?.env ?? {}),
  };
  const resolvedSkillConfig =
    options.skill?.config
      ? z.object(options.skill.config).parse(config.skillConfig?.[skillName ?? ""] ?? {})
      : {};
  const configAccessor = createSkillConfigAccessor(resolvedSkillConfig);
  const defaultStorageRoot =
    options.skill?.rootDir ? path.join(options.skill.rootDir, "storage") : path.join(process.cwd(), "storage");
  const paths = getRuntimePaths(options.storageRoot ?? skillConfig?.storageRoot ?? defaultStorageRoot);
  const storageStatePath = options.storageStatePath ?? path.join(paths.authDir, "user.json");

  await mkdir(path.dirname(storageStatePath), { recursive: true });
  await mkdir(paths.screenshotsDir, { recursive: true });
  await mkdir(paths.tracesDir, { recursive: true });

  const storageState = (await fileExists(storageStatePath)) ? storageStatePath : undefined;

  const browser = await chromium.launch({ headless: options.headed !== true });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    request: context.request,
    skill: {
      name: skillName ?? "unknown-skill",
    },
    config: configAccessor,
    env,
    paths,
    storageStatePath,
  };
}

export async function disposeRuntime(ctx: ToolContext): Promise<void> {
  await ctx.context.storageState({ path: ctx.storageStatePath });
  await ctx.context.close();
  await ctx.browser.close();
}
