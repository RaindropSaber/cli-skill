import { z } from "zod";
import { browserPlugin, defineTool } from "@cli-skill/core";

const inputSchema = z.object({
  url: z.string().url().default("https://example.com"),
});

const outputSchema = z.object({
  url: z.string().url(),
  title: z.string(),
});

export const sampleTool = defineTool({
  name: "sample_tool",
  description: "最小浏览器示例工具。",
  plugins: [browserPlugin],
  examples: [
    {
      scenario: "打开网页并返回页面标题",
      command: "__CLI_NAME__ run sample_tool '{\"url\":\"https://example.com\"}'",
    },
  ],
  inputSchema,
  outputSchema,
  async run(input, ctx) {
    await ctx.page.goto(input.url);
    const title = await ctx.page.title();
    return {
      url: input.url,
      title,
    };
  },
});
