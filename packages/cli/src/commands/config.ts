import type { CAC } from "cac";
import {
  getBrowserSkillConfigPath,
  getConfigValue,
  loadBrowserSkillCliConfig,
  parseConfigCliValue,
  saveBrowserSkillCliConfig,
  setConfigValue,
  unsetConfigValue,
} from "../config";
import { getCurrentSkillProject } from "../registry";

function printConfigValue(value: unknown): void {
  if (typeof value === "string") {
    console.log(value);
    return;
  }

  if (typeof value === "undefined") {
    console.log("undefined");
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

export function registerConfigCommand(cli: CAC): void {
  cli
    .command("config [...args]", "Manage cli-skill config")
    .usage("config get [keyPath]\n  cli-skill config set <keyPath> <value>\n  cli-skill config unset <keyPath>")
    .action(async (args: string[] = []) => {
      const [subcommand, keyPath, rawValue] = args;
      let currentSkillName: string | null = null;

      try {
        currentSkillName = (await getCurrentSkillProject()).skillName;
      } catch {}

      const scopedKeyPath = currentSkillName && keyPath
        ? `skillConfig.${currentSkillName}.${keyPath}`
        : currentSkillName
          ? `skillConfig.${currentSkillName}`
          : keyPath;

      if (subcommand === "get") {
        const currentConfig = await loadBrowserSkillCliConfig();
        const value = getConfigValue(currentConfig, scopedKeyPath);
        printConfigValue(value);
        return;
      }

      if (subcommand === "set") {
        if (!keyPath || typeof rawValue === "undefined") {
          throw new Error("Usage: cli-skill config set <keyPath> <value>");
        }

        const currentConfig = await loadBrowserSkillCliConfig();
        const nextConfig = setConfigValue(
          currentConfig,
          scopedKeyPath!,
          parseConfigCliValue(rawValue),
        );
        await saveBrowserSkillCliConfig(nextConfig);
        console.log(getBrowserSkillConfigPath());
        return;
      }

      if (subcommand === "unset") {
        if (!keyPath) {
          throw new Error("Usage: cli-skill config unset <keyPath>");
        }

        const currentConfig = await loadBrowserSkillCliConfig();
        const nextConfig = unsetConfigValue(currentConfig, scopedKeyPath!);
        await saveBrowserSkillCliConfig(nextConfig);
        console.log(getBrowserSkillConfigPath());
        return;
      }

      throw new Error("Usage: cli-skill config get [keyPath] | cli-skill config set <keyPath> <value> | cli-skill config unset <keyPath>");
    });
}
