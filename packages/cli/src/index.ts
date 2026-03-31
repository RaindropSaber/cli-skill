import { createApp } from "./app";
import { ensureBrowserSkillCliConfig } from "./config";
export { initSkillProject } from "./project";

async function main(argv = process.argv.slice(2)): Promise<void> {
  await ensureBrowserSkillCliConfig();
  const cli = createApp();
  cli.parse(["node", "browser-skill", ...argv], { run: false });
  await cli.runMatchedCommand();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
