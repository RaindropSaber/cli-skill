import { cac } from "cac";
import { registerConfigCommand } from "./commands/config";
import { registerSyncSkillCommand } from "./commands/docs";
import { registerInitCommand } from "./commands/init";
import { registerInstallCommand } from "./commands/install";
import { registerLinkCommand } from "./commands/link";
import { registerUninstallCommand } from "./commands/uninstall";
import { registerUnlinkCommand } from "./commands/unlink";

export function createApp() {
  const cli = cac("browser-skill");

  registerInitCommand(cli);
  registerConfigCommand(cli);
  registerSyncSkillCommand(cli);
  registerLinkCommand(cli);
  registerUnlinkCommand(cli);
  registerInstallCommand(cli);
  registerUninstallCommand(cli);

  cli.help();
  cli.version("0.1.0");
  return cli;
}
