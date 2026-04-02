import type { SkillDefinition, SkillPlugin, ToolDefinition } from "./types";

export function definePlugin<Ctx extends object>(plugin: SkillPlugin<Ctx>): SkillPlugin<Ctx> {
  return plugin;
}

export function defineTool<
  const Plugins extends readonly SkillPlugin<any>[],
  InputSchema extends import("zod").ZodTypeAny,
  OutputSchema extends import("zod").ZodTypeAny,
>(
  tool: ToolDefinition<InputSchema, OutputSchema, Plugins>,
): ToolDefinition<InputSchema, OutputSchema, Plugins> {
  return tool;
}

export function defineSkill<
  Tools extends readonly ToolDefinition<any, any, any>[],
  ConfigShape extends import("zod").ZodRawShape,
>(skill: SkillDefinition<Tools, ConfigShape>): SkillDefinition<Tools, ConfigShape> {
  return skill;
}
