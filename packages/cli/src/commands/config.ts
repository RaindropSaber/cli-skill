import type { CAC } from "cac";
import {
  findNearestLocalCliSkillConfigPath,
  getCliSkillConfigPath,
  getConfigValue,
  getLocalCliSkillConfigPath,
  getResolvedCliSkillConfig,
  loadCliSkillConfig,
  loadCliSkillConfigFile,
  parseConfigCliValue,
  saveCliSkillConfig,
  saveCliSkillConfigFile,
  setConfigValue,
  unsetConfigValue,
} from "../config";

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
    .option("--global", "Use the global config file in the home directory")
    .option("--local", "Use the nearest local config file, or create one in the current directory")
    .action(async (args: string[] = [], options?: { global?: boolean; local?: boolean }) => {
      const [subcommand, keyPath, rawValue] = args;
      const useGlobal = Boolean(options?.global);
      const useLocal = Boolean(options?.local);

      if (useGlobal && useLocal) {
        throw new Error("Use either --global or --local, not both.");
      }

      async function getLocalConfigTargetPath(): Promise<string> {
        return (await findNearestLocalCliSkillConfigPath(process.cwd()))
          ?? getLocalCliSkillConfigPath(process.cwd());
      }

      if (subcommand === "get") {
        const currentConfig = useGlobal
          ? await loadCliSkillConfig()
          : useLocal
          ? await loadCliSkillConfigFile(await getLocalConfigTargetPath())
          : await getResolvedCliSkillConfig(process.cwd());
        const value = getConfigValue(currentConfig, keyPath);
        printConfigValue(value);
        return;
      }

      if (subcommand === "set") {
        if (!keyPath || typeof rawValue === "undefined") {
          throw new Error("Usage: cli-skill config set <keyPath> <value>");
        }

        const targetPath = useGlobal
          ? getCliSkillConfigPath()
          : await getLocalConfigTargetPath();
        const currentConfig = useGlobal
          ? await loadCliSkillConfig()
          : await loadCliSkillConfigFile(targetPath);
        const nextConfig = setConfigValue(
          currentConfig,
          keyPath,
          parseConfigCliValue(rawValue),
        );
        if (useGlobal) {
          await saveCliSkillConfig(nextConfig);
        } else {
          await saveCliSkillConfigFile(targetPath, nextConfig);
        }
        console.log(targetPath);
        return;
      }

      if (subcommand === "unset") {
        if (!keyPath) {
          throw new Error("Usage: cli-skill config unset <keyPath>");
        }

        const targetPath = useGlobal
          ? getCliSkillConfigPath()
          : await getLocalConfigTargetPath();
        const currentConfig = useGlobal
          ? await loadCliSkillConfig()
          : await loadCliSkillConfigFile(targetPath);
        const nextConfig = unsetConfigValue(currentConfig, keyPath);
        if (useGlobal) {
          await saveCliSkillConfig(nextConfig);
        } else {
          await saveCliSkillConfigFile(targetPath, nextConfig);
        }
        console.log(targetPath);
        return;
      }

      throw new Error("Usage: cli-skill config get [keyPath] | cli-skill config set <keyPath> <value> | cli-skill config unset <keyPath>");
    });
}
