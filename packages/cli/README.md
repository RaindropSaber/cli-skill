# @cli-skill/cli

`@cli-skill/cli` 是 `cli-skill` 的平台命令入口。

如果说整个项目解决的是“怎么把一个流程做成技能”，这个包解决的就是其中的工作流部分：创建项目、构建产物、安装技能、挂载技能、发布技能，以及启动浏览器录制。

## 这个包负责什么

- 创建新的技能项目
- 在当前技能目录里执行构建、运行和发布命令
- 维护本机技能注册表
- 安装和卸载已发布技能
- 挂载和取消挂载技能
- 读写 `~/.cli-skill/config.json`
- 启动浏览器录制

## 常见命令

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
cli-skill browser record
```

### 当前技能目录命令

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

### 创建并挂载一个新技能

```bash
cli-skill create my-skill --cli-name my-skill
cd ./my-skill
bun install
cli-skill build
cli-skill mount
```

### 在当前技能目录里运行工具

```bash
cli-skill run <tool-name> '{"foo":"bar"}'
```

### 执行一个已注册技能的工具

```bash
cli-skill exec <skill-name> <tool-name> '{"foo":"bar"}'
```

### 开始一次浏览器录制

```bash
cli-skill browser record
```

## 技能项目约定

`@cli-skill/cli` 约定技能项目使用下面这套结构：

- `src/index.ts`
- `src/tools/*`
- `src/skill/*`

执行 `cli-skill build` 后，会把 `src/skill/` 下的模板渲染成根目录 `skill/` 产物。

常用模板变量包括：

- `{{name}}`
- `{{description}}`
- `{{overview}}`
- `{{toolReference}}`
- `{{configReference}}`

## 本地目录

- 当前目录创建的技能项目：
  - `./<skill-name>`
- 已安装技能：
  - `~/.cli-skill/skills`
- 本机注册表：
  - `~/.cli-skill/registry.json`
- 默认 agent 目录：
  - `~/.agents/skills`
- 浏览器共享 storage：
  - `~/.cli-skill/browser/storage`
- 浏览器录制结果：
  - `~/.cli-skill/browser-recorder`

## 技能自带命令

模板生成出来的技能会带一个很薄的 bin，例如：

```bash
my-skill list
my-skill run <tool>
my-skill <tool>
```

它适合：

- 查看这个技能有哪些工具
- 直接执行某个工具

项目管理相关动作仍然统一通过 `cli-skill` 完成，例如：

- `build`
- `mount`
- `unmount`
- `publish`
