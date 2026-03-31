import { cac } from "cac";
import { createSkillProject } from "./create-skill-project";

async function main(argv = process.argv.slice(2)): Promise<void> {
  const cli = cac("browser-skill-create-template");

  cli
    .command("[root]", "Generate a browser skill from a named template")
    .option("--template <templateName>", "Template name", {
      default: "basic",
    })
    .option("--skill-name <skillName>", "Skill name")
    .option("--cli-name <cliName>", "CLI name")
    .option("--target-dir <targetDir>", "Output directory")
    .option("--core-package-path <corePackagePath>", "Local @browser-skill/core package path")
    .action(
      async (
        _root: string | undefined,
        options: {
          template?: string;
          skillName?: string;
          cliName?: string;
          targetDir?: string;
          corePackagePath?: string;
        },
      ) => {
        if (!options.skillName) {
          throw new Error("Missing --skill-name");
        }
        if (!options.targetDir) {
          throw new Error("Missing --target-dir");
        }
        if (!options.corePackagePath) {
          throw new Error("Missing --core-package-path");
        }

        const targetDir = await createSkillProject({
          templateName: options.template ?? "basic",
          skillName: options.skillName,
          cliName: options.cliName ?? options.skillName,
          targetDir: options.targetDir,
          corePackagePath: options.corePackagePath,
        });

        console.log(targetDir);
      },
    );

  cli.help();
  cli.parse(["node", "browser-skill-create-template", ...argv]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
