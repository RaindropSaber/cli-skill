# @cli-skill/core

`@cli-skill/core` 提供的是技能的定义方式和运行时模型。

它不负责项目脚手架、安装、发布、挂载这些平台动作；这些事情在 `@cli-skill/cli`。这个包只关注一件事：怎么把一个技能和它的工具稳定地定义出来并运行。

## 这个包提供什么

- `defineSkill`
- `defineTool`
- 插件能力，例如 `browserPlugin`
- 工具执行入口：
  - `listTools`
  - `runTool`

## 技能和工具模型

一个技能主要描述：

- 名称
- 描述
- 概览
- 配置
- 工具列表

一个工具主要描述：

- 名称
- 描述
- 示例
- 输入 schema
- 输出 schema
- 需要的插件
- `run(input, ctx)`

其中 `ctx` 会根据 `plugins` 自动推导。

## 插件能力

插件负责给工具提供运行时上下文。

例如 `browserPlugin` 会提供：

- `browser`
- `context`
- `page`
- `request`

当前插件生命周期是单次执行：

1. `setup`
2. `tool.run`
3. `dispose`

## 示例

```ts
import { z } from "zod";
import { browserPlugin, defineSkill, defineTool } from "@cli-skill/core";

const inputSchema = z.object({
  url: z.string().url(),
});

const outputSchema = z.object({
  url: z.string().url(),
  title: z.string(),
});

const openPageTool = defineTool({
  name: "open_page",
  description: "Open a page and return its title.",
  plugins: [browserPlugin],
  inputSchema,
  outputSchema,
  async run(input, ctx) {
    await ctx.page.goto(input.url);
    return {
      url: input.url,
      title: await ctx.page.title(),
    };
  },
});

export default defineSkill({
  name: "example",
  description: "Example skill.",
  overview: "An example skill powered by Playwright.",
  config: {},
  tools: [openPageTool],
});
```

## 浏览器状态

`browserPlugin` 默认会使用共享浏览器 storage：

- `~/.cli-skill/browser/storage`

这意味着：

- 浏览器录制
- 浏览器工具执行

默认可以共享登录态。

如果需要改路径，可以通过 `~/.cli-skill/config.json` 里的：

- `browserStorageRoot`

覆盖默认值。

## 依赖约定

- `playwright` 由 `@cli-skill/core` 提供
- `zod` 是 `peerDependencies`
- 如果技能项目自己直接使用 `zod`，应该在技能项目里显式声明它
