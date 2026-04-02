import { defineSkill } from "@cli-skill/core";
import { sampleTool } from "./tools/sample-tool";

const skill = defineSkill({
  name: "__SKILL_NAME__",
  description: "说明如何使用 __CLI_NAME__ 操作 __SKILL_NAME__ skill。",
  overview: "这个 skill 提供一个浏览器示例工具 `sample_tool`，用于打开页面并返回标题，验证插件注入的 ctx 能力是否正常工作。",
  config: {},
  tools: [sampleTool],
});

export default skill;
