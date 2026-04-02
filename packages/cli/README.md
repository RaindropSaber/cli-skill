# @cli-skill/cli

`@cli-skill/cli` 是 `cli-skill` 的平台命令行入口。

它不是某一个具体 skill 的运行时，而是整个 skill 生命周期和本地注册表的管理入口。

## 主要职责

- 创建新的 skill 项目
- 维护本地 skill 注册表
- 提供当前目录命令和已注册 skill 执行入口
- 生成 `skill/` 产物
- 安装和卸载已发布 skill
- 挂载和取消挂载本地 skill
- 发布本地 skill
- 读写 `~/.cli-skill/config.json`

## 命令结构

### 平台命令

```bash
cli-skill create <skillName> --cli-name <cliName> [--template <templateName>]
cli-skill list
cli-skill tools <skillName>
cli-skill install <skillName> [--packageName <packageName>]
cli-skill uninstall <packageName>
cli-skill config get [keyPath]
cli-skill config set <keyPath> <value>
cli-skill exec <skillName> <toolName> [rawInput]
```

### 当前目录命令

```bash
cli-skill tools
cli-skill run <toolName> [rawInput]
cli-skill config get [keyPath]
cli-skill config set <keyPath> <value>
cli-skill config unset <keyPath>
cli-skill build
cli-skill mount [targetPath]
cli-skill unmount [targetPath]
cli-skill publish [--dry-run] [--tag <tag>]
```

## 典型工作流

```bash
cli-skill create my-skill --cli-name my-skill
cd ./my-skill
bun install
cli-skill build
cli-skill mount
```

## skill 项目结构

一个标准 skill 项目包含：

- `src/index.ts`
- `src/tools/*`
- `src/skill/*`

其中：

- `src/index.ts`
  - 定义并导出 skill
- `src/tools/*`
  - 定义 tools
- `src/skill/*`
  - 文档模板源目录

模板生成出来的 skill 包会同时依赖：

- `@cli-skill/core`
  - 运行 skill
- `@cli-skill/cli`
  - 在项目目录内调用 `cli-skill build`、`cli-skill mount` 等命令

执行 `cli-skill build` 后会生成：

- `skill/SKILL.md`
- `skill/agents/openai.yaml`

所以：

- `src/skill/` 是源码
- 根目录 `skill/` 是产物

## build 输入

`cli-skill build` 会读取：

- `src/index.ts`
- `src/skill/`

`src/skill/` 下的 `.md`、`.yaml`、`.yml` 文件会被当成模板渲染到根目录 `skill/`。

当前常用模板变量有：

- `{{name}}`
- `{{description}}`
- `{{overview}}`
- `{{toolReference}}`
- `{{configReference}}`

## 安装模型

本地创建的 skill 默认放在当前目录：

- `./<skill-name>`

已安装 skill 默认放在：

- `~/.cli-skill/skills`

本地注册表默认放在：

- `~/.cli-skill/registry.json`

默认 agent 目录是：

- `~/.agents/skills`

`install` 默认接受 skill 名。CLI 会在 npm 中查找同时包含：

- `cli-skill`
- `<skillName>`

这两个关键词的包。

如果已经知道包名，可以显式指定：

```bash
cli-skill install fx --packageName @scope/cli-skill-fx
```

## skill bin 的行为

生成出来的 skill 自带一个很薄的 bin。

例如：

```bash
my-skill list
my-skill open_page '{"url":"https://example.com"}'
```

它适合做：

- 查看这个 skill 的 tool 列表
- 直接执行某个 tool

它不承担项目管理命令。以下操作仍然只通过 `cli-skill` 使用：

- `build`
- `mount`
- `unmount`
- `publish`
