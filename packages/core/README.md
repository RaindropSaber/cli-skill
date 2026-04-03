# @cli-skill/core

`@cli-skill/core` 提供的是 skill 的类型系统和运行模型。

它是 skill 项目里用来定义 skill、定义 tool、注入插件能力的核心包。

它不负责平台 CLI 的命令解析。命令层在 `@cli-skill/cli`。

## 核心 API

- `defineSkill`
- `defineTool`
- 内置插件，例如 `browserPlugin`
- runtime 上下文的创建与销毁
- `listTools`
- `runTool`

## skill 模型

一个 skill 当前声明：

- `name`
- `description`
- `overview`
- `config`
- `tools`

`defineSkill` 的职责是组织 tools 和声明 skill 元信息，不负责项目级工作流。

## tool 模型

一个 tool 当前声明：

- `name`
- `description`
- `plugins`
- `examples`
- `inputSchema`
- `outputSchema`
- `run(input, ctx)`

`run` 中可用的 `ctx` 会根据 `tool.plugins` 自动推导。

## plugin 模型

plugin 负责提供运行时能力和对应的上下文字段。

例如 `browserPlugin` 会提供：

- `browser`
- `context`
- `page`
- `request`

并默认使用共享浏览器 storage：

- `~/.cli-skill/browser/storage`

当前 plugin 生命周期是单次执行：

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

## 依赖说明

- `zod` 是 `peerDependencies`
- `playwright` 是 `dependencies`
- 如果 skill 项目自己直接 `import { z } from "zod"`，就应在 skill 自己的包里声明 `zod`

这也是为什么生成出来的 skill 模板会把 `zod` 放在 skill 自己的 `dependencies` 里。

## 浏览器状态共享

`browserPlugin` 默认会把浏览器运行时的 storage 根目录放到：

- `~/.cli-skill/browser/storage`

这意味着：

- 浏览器录制
- tool 执行

默认可以共享登录态。

如果需要修改，可以通过 `~/.cli-skill/config.json` 里的：

- `browserStorageRoot`

覆盖默认路径。
