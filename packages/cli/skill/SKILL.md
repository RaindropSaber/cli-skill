---
name: cli-skill-creator
description: 当任务涉及 cli skill 的创建、挂载、安装、发布或配置时，使用 cli-skill CLI。
---

# cli-skill-creator

这个 skill 面向的是：需要创建、修改、接通、安装或发布 cli skill 的任务。

如果需要查看 skill 源码结构和 core API 参考，继续看：

- [references/core.md](/Users/bin.jia1/work/github/cli-skill/packages/cli/skill/references/core.md)

## 使用时机

- 创建新的 cli skill
- 修改已有 skill
- 构建 `skill/` 产物
- 把本地 skill 接到 agent 目录
- 安装或卸载已发布 skill
- 发布本地 skill
- 读写 cli-skill 配置

## 工作模型

处理 cli skill 时，默认按三类命令来理解：

- 平台命令
  - `cli-skill create`
  - `cli-skill list`
  - `cli-skill install`
  - `cli-skill uninstall`
  - `cli-skill config ...`
- 当前目录命令
  - `cli-skill tools`
  - `cli-skill run`
  - `cli-skill build`
  - `cli-skill mount`
  - `cli-skill publish`
- 已注册 skill 执行命令
  - `cli-skill exec <skill-name> ...`

skill 自己的 bin 只是一个转发入口，最终会落到 `cli-skill exec <skill-name> ...`。

## 默认流程

当用户要新建一个 skill 时，默认流程是：

```bash
cli-skill create <skill-name> --cli-name <cli-name>
cd ./<skill-name>
bun install
cli-skill build
cli-skill mount
```

如果没有提供 `cli-name`，默认令它等于 `skill-name`。

## 项目结构

默认 skill 项目结构：

- `src/index.ts`
- `src/tools/*`
- `src/skill/*`

含义：

- `src/index.ts`
  - skill 定义入口
- `src/tools/*`
  - tool 源码
- `src/skill/*`
  - 文档模板源目录

执行 `cli-skill build` 会生成：

- `skill/SKILL.md`
- `skill/agents/openai.yaml`

## 常用命令

| 场景 | 命令 |
| --- | --- |
| 创建 skill | `cli-skill create <skill-name> --cli-name <cli-name> [--template <templateName>]` |
| 查看 skill 列表 | `cli-skill list` |
| 安装已发布 skill | `cli-skill install <skill-name>` |
| 卸载已发布 skill | `cli-skill uninstall <package-name>` |
| 查看 tool 列表 | `cli-skill tools` |
| 运行当前目录 tool | `cli-skill run <tool-name> [rawInput]` |
| 运行已注册 skill 的 tool | `cli-skill exec <skill-name> <tool-name> [rawInput]` |
| 读取当前 skill 配置 | `cli-skill config get [keyPath]` |
| 写入当前 skill 配置 | `cli-skill config set <keyPath> <value>` |
| 删除当前 skill 配置 | `cli-skill config unset <keyPath>` |
| 挂载当前 skill | `cli-skill mount [targetPath]` |
| 取消挂载当前 skill | `cli-skill unmount [targetPath]` |
| 构建 skill 产物 | `cli-skill build` |
| 发布当前 skill | `cli-skill publish [--dry-run] [--tag <tag>]` |
| 读取全局配置 | `cli-skill config get [keyPath]` |
| 写入全局配置 | `cli-skill config set <keyPath> <value>` |

## 关键规则

- `create` 只创建项目，不会自动安装依赖，也不会自动挂载。
- `build` 负责把 `src/skill/*` 渲染成根目录 `skill/*`。
- `mount` 负责：
  - 接通 skill 的 bin
  - 注册根目录 `skill/` 到 agent 目录
- `mount` 不应隐式执行 `install`。
- `install` / `uninstall` 面向已发布 skill。
- `publish` 只针对当前目录的本地 skill。

默认目录：

- 当前目录创建的 skill：
  - `./<skill-name>`
- 已安装 skill：
  - `~/.cli-skill/skills/<skill-name>`
- 本地注册表：
  - `~/.cli-skill/registry.json`
- agent 默认目录：
  - `~/.agents/skills/<skill-name>`

## 配置

全局配置文件：

- `~/.cli-skill/config.json`

skill 作用域配置路径：

- `skillConfig.<skill-name>`

常见命令：

```bash
cli-skill config get
cli-skill config set skillsRoot ~/.cli-skill/skills
cd ./<skill-name>
cli-skill config get
cli-skill config set baseUrl https://example.com
```

## 文档规则

- `src/skill/*` 是模板源目录
- `skill/*` 是生成产物
- tool 或配置变更后，应重新执行：

```bash
cli-skill build
```

## 不要做的事

- 不要把 `create` 当成“已经可执行”
- 不要手动改 `~/.agents/skills`
- 不要把 skill bin 当成独立平台
- 不要在修改已有 skill 时重新 `create`
