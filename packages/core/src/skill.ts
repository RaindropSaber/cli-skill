import type { SkillDefinition, ToolDefinition } from "./types";

export function defineTool<
  InputSchema extends import("zod").ZodTypeAny,
  OutputSchema extends import("zod").ZodTypeAny,
>(tool: ToolDefinition<InputSchema, OutputSchema>): ToolDefinition<InputSchema, OutputSchema> {
  return tool;
}

export function defineSkill<
  Tools extends readonly ToolDefinition[],
  ConfigShape extends import("zod").ZodRawShape,
>(skill: SkillDefinition<Tools, ConfigShape>): SkillDefinition<Tools, ConfigShape> {
  return skill;
}
