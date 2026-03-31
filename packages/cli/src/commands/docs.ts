import type { CAC } from "cac";
import { renderSkillDocsMarkdown, writeSkillDocsMarkdown } from "@cli-skill/core";
import { ensureValidSkillProject, loadSkillDefinition } from "../project";

export function registerSyncSkillCommand(cli: CAC): void {
  cli
    .command("sync-skill", "Generate Tool / Config sections for the current skill")
    .option("--write", "Write generated sections back into skill/SKILL.md")
    .action(async (options: { write?: boolean }) => {
      const projectDir = process.cwd();
      await ensureValidSkillProject(projectDir);
      const skill = await loadSkillDefinition(projectDir);

      if (options.write) {
        const updatedPath = await writeSkillDocsMarkdown(skill);
        console.log(updatedPath);
        return;
      }

      console.log(renderSkillDocsMarkdown(skill));
    });
}
