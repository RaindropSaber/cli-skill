import type { CAC } from "cac";
import { DEFAULT_TEMPLATE_NAME } from "../constants";
import { createSkillProject } from "../project";
import { registerLocalSkillProject } from "../registry";

function resolveTemplateName(templateOption?: string): string {
  return templateOption ?? DEFAULT_TEMPLATE_NAME;
}

export function registerCreateCommand(cli: CAC): void {
  cli
    .command("create <skillName>", "Create a cli skill project")
    .option("--cli-name <cliName>", "Override the generated CLI name")
    .option(
      "--template <templateName>",
      `Template name. Defaults to ${DEFAULT_TEMPLATE_NAME}`,
    )
    .action(async (skillName: string, options: { cliName?: string; template?: string }) => {
      const targetDir = await createSkillProject(
        skillName,
        options.cliName ?? skillName,
        resolveTemplateName(options.template),
      );
      await registerLocalSkillProject(targetDir);
      console.log(targetDir);
    });
}
