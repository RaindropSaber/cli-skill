import { defineSkill } from "@cli-skill/core";
import { sampleTool } from "./tools/sample-tool";

const skill = defineSkill({
  name: "__SKILL_NAME__",
  description: "__SKILL_NAME__ 技能的默认项目骨架。",
  overview: "这个技能当前包含一个最小浏览器示例工具 `sample_tool`。创建真实技能时，应把这里改成你的业务目标、适用场景和核心流程说明。",
  config: {},
  tools: [sampleTool],
});

export default skill;
