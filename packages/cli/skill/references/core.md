# Core Reference

这份参考页回答的不是“命令怎么敲”，而是：

**一个 cli skill 的源码应该怎么组织。**

如果主 `SKILL.md` 解决的是工作流，那么这里解决的是源码模型。

## 先建立心智

写一个 cli skill 时，先把这三层区分开：

- `tool`
  - 真正执行动作的最小单元
- `skill`
  - 对 tools 的组织与描述
- `build` 产物
  - 给 agent 使用的 `skill/` 目录

源码不是直接写给 agent 的。  
源码先定义 skill 和 tools，然后再由 `build` 生成 agent 真正消费的产物。

## skill 项目源码结构

当前单个 skill 项目默认包含：

- `src/index.ts`
- `src/tools/*`
- `src/skill/*`

它们的职责分别是：

- `src/index.ts`
  - 定义并导出 skill
- `src/tools/*`
  - 定义 tools
- `src/skill/*`
  - 文档模板源目录

执行：

```bash
cli-skill <skill-name> build
```

之后，根目录会生成：

- `skill/SKILL.md`
- `skill/agents/openai.yaml`

所以一定要区分：

- `src/skill/*` 是源码
- `skill/*` 是产物

## `defineSkill` 负责什么

`defineSkill` 只负责描述这个 skill 本身。

当前它声明的是：

- `name`
- `description`
- `overview`
- `config`
- `tools`

也就是说，skill 只做“组织”和“说明”，不直接承担运行时能力注入。

## `defineTool` 负责什么

`defineTool` 才是运行能力的核心。

一个 tool 当前声明这些内容：

- `name`
- `description`
- `plugins`
- `examples`
- `inputSchema`
- `outputSchema`
- `run(input, ctx)`

最关键的一点是：

- tool 自己声明 `plugins`
- `ctx` 从 `plugins` 自动推导

所以你不需要手写 `ctx` 泛型，也不需要在 skill 上重复声明插件。

## 为什么 plugin 放在 tool 上

当前模型里，tool 才是真正执行动作的单位。

所以：

- skill 只负责组织 tools
- tool 负责声明自己需要什么能力

这样做的结果是：

- skill 更轻
- tool 的依赖更清楚
- `ctx` 的来源更明确

换句话说，运行时能力是“执行问题”，不是“文档问题”。  
所以 plugin 挂在 tool 上，比挂在 skill 上更合理。

## plugin 注入怎么理解

plugin 负责两件事：

1. 提供运行时能力
2. 为 `ctx` 提供类型

例如 `browserPlugin` 会提供：

- `browser`
- `context`
- `page`
- `request`

当 tool 写成：

```ts
plugins: [browserPlugin]
```

那么 `run(input, ctx)` 里的 `ctx.page`、`ctx.request` 就会自动可用。

当前 plugin 生命周期是单次执行：

1. `setup`
2. `tool.run`
3. `dispose`

所以现在默认模型是“一次命令，一次 runtime”。

## 最小源码示例

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

这个例子里：

- `tool` 负责声明自己要 `browserPlugin`
- `skill` 只负责把它组织起来
- `build` 再负责生成 `skill/` 产物

## 文档模板怎么写

`src/skill/*` 下的 `.md/.yaml/.yml` 文件会在 build 时做变量替换。

当前常用变量有：

- `{{name}}`
- `{{description}}`
- `{{overview}}`
- `{{toolReference}}`
- `{{configReference}}`

所以建议把：

- Tool Reference
- Config Reference

交给模板变量，而不是手写重复内容。

## 依赖约定

`@cli-skill/core` 是一个库，不是最终 skill 包。

因此：

- `zod` 在 `core` 里是 `peerDependencies`
- skill 自己如果直接 `import { z } from "zod"`，就应在自己的包里声明 `zod`

这也是为什么生成出来的 skill 模板会把 `zod` 放在自己的 `dependencies` 里。

## 什么时候继续往下看

如果你需要的是：

- 怎么创建 skill
- 怎么 mount / install / publish
- 怎么 build 产物

优先回到主 skill 文档：

- [SKILL.md](/Users/bin.jia1/work/github/cli-skill/packages/cli/skill/SKILL.md)

这里更适合解决：

- skill 源码应该怎么写
- tool / skill / plugin 的职责边界是什么
