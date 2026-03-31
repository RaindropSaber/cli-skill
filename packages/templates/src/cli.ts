import { createSkillProject } from "./create-skill-project";

interface CliOptions {
  template?: string;
  skillName?: string;
  cliName?: string;
  targetDir?: string;
  corePackageVersion?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--skill-name") {
      options.skillName = next;
      index += 1;
      continue;
    }

    if (arg === "--template") {
      options.template = next;
      index += 1;
      continue;
    }

    if (arg === "--cli-name") {
      options.cliName = next;
      index += 1;
      continue;
    }

    if (arg === "--target-dir") {
      options.targetDir = next;
      index += 1;
      continue;
    }

    if (arg === "--core-package-version") {
      options.corePackageVersion = next;
      index += 1;
      continue;
    }
  }

  return options;
}

async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!options.skillName) throw new Error("Missing --skill-name");
  if (!options.targetDir) throw new Error("Missing --target-dir");
  if (!options.corePackageVersion) throw new Error("Missing --core-package-version");

  const targetDir = await createSkillProject({
    templateName: options.template ?? "basic",
    skillName: options.skillName,
    cliName: options.cliName ?? options.skillName,
    targetDir: options.targetDir,
    corePackageVersion: options.corePackageVersion,
  });

  console.log(targetDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
