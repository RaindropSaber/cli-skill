import { access, mkdir, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import get from "lodash/get";
import set from "lodash/set";
import path from "node:path";
import { z } from "zod";
import { getCliSkillHome, getDefaultBrowserRunsRoot, getResolvedCliSkillConfig } from "./config";
import type {
  AnySkill,
  BaseToolContext,
  InferToolsContext,
  RuntimeOptions,
  RuntimePaths,
  SkillConfigAccessor,
  SkillPlugin,
} from "./types";

const pluginCleanup = new WeakMap<object, Array<() => Promise<void>>>();

export function getRuntimePaths(
  storageRoot = path.join(process.cwd(), "storage"),
  browserRunsRoot = getDefaultBrowserRunsRoot(),
  browserUserDataDir = path.join(storageRoot, "user-data"),
): RuntimePaths {
  return {
    storageRoot,
    browserRunsRoot,
    browserUserDataDir,
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
    const packageJson = JSON.parse(packageJsonRaw) as { name?: string; cliSkill?: unknown };
    if (!packageJson.cliSkill || !packageJson.name) {
      return null;
    }

    const rawName = packageJson.name.split("/").at(-1) ?? packageJson.name;
    return rawName.startsWith("cli-skill-")
      ? rawName.slice("cli-skill-".length)
      : rawName;
  } catch {
    return null;
  }
}

async function setupPlugins(
  plugins: readonly SkillPlugin<any>[],
  ctx: BaseToolContext,
  options: RuntimeOptions,
  skill: AnySkill,
) {
  const globalConfig = await getResolvedCliSkillConfig(options.skill?.rootDir ?? process.cwd());
  const cleanupHandlers: Array<() => Promise<void>> = [];

  for (const plugin of plugins) {
    const pluginContext = await plugin.setup(ctx, {
      headed: options.headed,
      storageRoot: options.storageRoot,
      browserUserDataDir: options.browserUserDataDir,
      browserExecutablePath: options.browserExecutablePath,
      skill,
      globalConfig,
    });

    Object.assign(ctx, pluginContext);

    if (plugin.dispose) {
      cleanupHandlers.unshift(async () => {
        await plugin.dispose?.(ctx as BaseToolContext & object);
      });
    }
  }

  pluginCleanup.set(ctx as object, cleanupHandlers);
}

function collectPlugins(skill: AnySkill): SkillPlugin<any>[] {
  const plugins = new Map<string, SkillPlugin<any>>();

  for (const tool of skill.tools) {
    for (const plugin of tool.plugins ?? []) {
      plugins.set(plugin.name, plugin);
    }
  }

  return [...plugins.values()];
}

export async function createRuntime<Skill extends AnySkill = AnySkill>(
  options: RuntimeOptions<Skill> = {},
): Promise<BaseToolContext & InferToolsContext<Skill["tools"]>> {
  const globalConfig = await getResolvedCliSkillConfig(options.skill?.rootDir ?? process.cwd());
  const skillName = options.skill?.name ?? (await getCurrentSkillName());
  const env = {
    ...(globalConfig.env ?? {}),
  };
  const resolvedSkillConfig =
    options.skill?.config
      ? z.object(options.skill.config).parse(globalConfig)
      : {};
  const configAccessor = createSkillConfigAccessor(resolvedSkillConfig);
  const resolvedBrowserUserDataDir =
    options.browserUserDataDir ??
    globalConfig.browserUserDataDir ??
    path.join(getCliSkillHome(), "browser", "user-data");
  const resolvedStorageRoot =
    options.storageRoot ??
    resolvedBrowserUserDataDir;
  const paths = getRuntimePaths(
    resolvedStorageRoot,
    globalConfig.browserRunsRoot ?? getDefaultBrowserRunsRoot(),
    resolvedBrowserUserDataDir,
  );

  await mkdir(paths.browserUserDataDir, { recursive: true });
  await mkdir(paths.browserRunsRoot, { recursive: true });
  await mkdir(paths.screenshotsDir, { recursive: true });
  await mkdir(paths.tracesDir, { recursive: true });

  const ctx: BaseToolContext = {
    skill: {
      name: skillName ?? "unknown-skill",
    },
    config: configAccessor,
    env,
    paths,
  };

  const plugins = options.skill ? collectPlugins(options.skill) : [];

  if (plugins.length > 0 && options.skill) {
    await setupPlugins(plugins, ctx, options, options.skill);
  }

  return ctx as BaseToolContext & InferToolsContext<Skill["tools"]>;
}

export async function disposeRuntime(ctx: BaseToolContext): Promise<void> {
  const handlers = pluginCleanup.get(ctx as object) ?? [];
  for (const handler of handlers) {
    await handler();
  }
  pluginCleanup.delete(ctx as object);
}
