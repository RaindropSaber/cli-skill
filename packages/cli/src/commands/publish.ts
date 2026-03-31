import type { CAC } from "cac";
import { runBun } from "../bun";
import { getLocalSkillProjectDir } from "../registry";

export function registerPublishCommand(cli: CAC): void {
  cli
    .command("publish <skillName>", "Publish a local skill package")
    .option("--dry-run", "Run publish in dry-run mode")
    .option("--tag <tag>", "Publish under the given dist-tag")
    .action(async (skillName: string, options: { dryRun?: boolean; tag?: string }) => {
      const projectDir = await getLocalSkillProjectDir(skillName);
      const args = ["publish"];

      if (options.dryRun) {
        args.push("--dry-run");
      }

      if (options.tag) {
        args.push("--tag", options.tag);
      }

      await runBun(args, projectDir);
    });
}
