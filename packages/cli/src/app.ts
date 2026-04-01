import { cac } from "cac";
import { registerConfigCommand } from "./commands/config";
import { registerCreateCommand } from "./commands/create";
import { registerDisableCommand } from "./commands/disable";
import { registerSyncSkillCommand } from "./commands/docs";
import { registerEnableCommand } from "./commands/enable";
import { registerInstallCommand } from "./commands/install";
import { registerListCommand } from "./commands/list";
import { registerPublishCommand } from "./commands/publish";
import { registerUninstallCommand } from "./commands/uninstall";

export function createApp(version: string) {
  const cli = cac("cli-skill");

  registerCreateCommand(cli);
  registerConfigCommand(cli);
  registerSyncSkillCommand(cli);
  registerListCommand(cli);
  registerEnableCommand(cli);
  registerDisableCommand(cli);
  registerInstallCommand(cli);
  registerUninstallCommand(cli);
  registerPublishCommand(cli);

  cli.help();
  cli.version(version);
  return cli;
}
