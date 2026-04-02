import { createApp } from "./app";
import { ensureBrowserSkillCliConfig } from "./config";
import { getCliVersion } from "./version";
export { createSkillProject } from "./project";

async function main(argv = process.argv.slice(2)): Promise<void> {
  await ensureBrowserSkillCliConfig();
  const cli = createApp(await getCliVersion());
  cli.parse(["node", "cli-skill", ...argv], { run: false });
  await cli.runMatchedCommand();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
