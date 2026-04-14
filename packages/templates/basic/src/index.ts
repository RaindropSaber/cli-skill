import { defineSkill } from "@cli-skill/core";
import { sampleTool } from "./tools/sample-tool";

const skill = defineSkill({
  name: "__SKILL_NAME__",
  description: "__SKILL_NAME__ 的默认技能项目骨架。",
  overview: "把这里改成这个技能真正要解决的任务、典型使用场景和默认流程。不要停留在模板描述本身。",
  config: {},
  tools: [sampleTool],
});

export default skill;
