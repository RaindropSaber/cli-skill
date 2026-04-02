# @cli-skill/cli

`@cli-skill/cli` 是 `cli-skill` 的平台命令行入口。

它不是某一个具体 skill 的运行时，而是整个 skill 生命周期的管理入口。

## 主要职责

- 创建新的 skill 项目
- 提供统一的 skill 作用域命令入口
- 构建 `skill/` 产物
- 安装和卸载已发布 skill
- 挂载和取消挂载本地 skill
- 发布本地 skill
- 读写 `~/.cli-skill/config.json`

## 命令结构

### 平台命令

```bash
cli-skill create <skillName> --cli-name <cliName> [--template <templateName>]
cli-skill list
cli-skill install <skillName> [--packageName <packageName>]
cli-skill uninstall <packageName>
cli-skill config get [keyPath]
cli-skill config set <keyPath> <value>
```

### skill 作用域命令

```bash
cli-skill <skillName> list
cli-skill <skillName> run <toolName> [rawInput]
cli-skill <skillName> config get [keyPath]
cli-skill <skillName> config set <keyPath> <value>
cli-skill <skillName> config unset <keyPath>
cli-skill <skillName> mount [targetPath]
cli-skill <skillName> unmount [targetPath]
cli-skill <skillName> build
cli-skill <skillName> publish [--dry-run] [--tag <tag>]
```

## 典型工作流

```bash
cli-skill create my-skill --cli-name my-skill
cd ~/.cli-skill/skills/my-skill
bun install
cli-skill my-skill build
cli-skill my-skill mount
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

执行 `build` 后会生成：

- `skill/SKILL.md`
- `skill/agents/openai.yaml`

所以：

- `src/skill/` 是源码
- 根目录 `skill/` 是产物

## build 输入

`cli-skill <skillName> build` 会读取：

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

本地 skill 默认放在：

- `~/.cli-skill/skills`

托管安装目录默认是：

- `~/.cli-skill/installed`

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
