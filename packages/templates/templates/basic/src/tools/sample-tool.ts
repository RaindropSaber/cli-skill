import { z } from 'zod';
import { defineTool, okResult } from '@browser-skill/core';

const inputSchema = z.object({
  message: z.string(),
});

const outputSchema = z.object({
  ok: z.literal(true),
  echoed: z.string(),
});

export const sampleTool = defineTool({
  name: 'sample_tool',
  description: '最小示例工具。',
  examples: [
    {
      scenario: '验证 skill 和 CLI 是否已接通',
      command: "__CLI_NAME__ run sample_tool '{\"message\":\"hello\"}'",
    },
  ],
  inputSchema,
  outputSchema,
  async run(input: z.infer<typeof inputSchema>, ctx) {
    return okResult({
      echoed: `${input.message}:${ctx.skill.name}`,
    });
  },
});
