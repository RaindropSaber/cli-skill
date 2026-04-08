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

## 配置模型

`@cli-skill/core` 运行时看到的是一份已经合并好的配置对象：

- 默认值
- `~/.cli-skill-config.json`
- 当前目录及父目录里的 `.cli-skill-config.json`

平台不会再自动给每个技能包一层 `skillConfig.<skillName>`。

如果某个技能需要自己的配置隔离，应该由技能自己定义 key 结构，例如：

- `mySkill.baseUrl`
- `mySkill.env`

运行时会直接把这份合并后的顶层配置交给技能自己的 `config schema` 去解析。

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

如果全局或目录配置里打开了：

- `recordBrowserRun`

那么 `browserPlugin` 会在浏览器工具执行时顺手沉淀一份本次运行记录。即使工具失败，错误里也会带上：

- `recordingDir`
- `summaryPath`

这样上层 agent 可以先复盘这次运行过程，再决定如何调整工具。

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

`browserPlugin` 默认会使用同一份浏览器用户目录：

- `~/.cli-skill/browser/user-data`

这意味着：

- 浏览器录制
- 浏览器工具执行

默认会共享登录态，以及浏览器级的地址栏历史等浏览器记忆。

如果需要改路径，可以通过 `~/.cli-skill-config.json` 里的：

- `browserUserDataDir`
- `browserSourceUserDataDir`
- `recordBrowserRun`

覆盖默认值。

## 依赖约定

- `playwright` 由 `@cli-skill/core` 提供
- `zod` 是 `peerDependencies`
- 如果技能项目自己直接使用 `zod`，应该在技能项目里显式声明它
