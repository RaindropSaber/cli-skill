import { cac } from "cac";
import { registerConfigCommand } from "./commands/config";
import { registerCreateCommand } from "./commands/create";
import { registerInstallCommand } from "./commands/install";
import { registerListCommand } from "./commands/list";
import { registerSkillCommand } from "./commands/skill";
import { registerUninstallCommand } from "./commands/uninstall";

export function createApp(version: string) {
  const cli = cac("cli-skill");

  registerCreateCommand(cli);
  registerConfigCommand(cli);
  registerListCommand(cli);
  registerInstallCommand(cli);
  registerUninstallCommand(cli);
  registerSkillCommand(cli);

  cli.help();
  cli.version(version);
  return cli;
}
