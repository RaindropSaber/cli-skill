import { defineSkill } from "@browser-skill/core";
import { tools } from "./tools";

export const skill = defineSkill({
  name: "__SKILL_NAME__",
  cliName: "__CLI_NAME__",
  config: {},
  tools,
});

export default skill;
