# cli-skill

`cli-skill` 是一套面向 agent skill 的开发工具链。

它解决的不是单个脚本怎么跑，而是整条 skill 生命周期怎么建立起来：

- 在本地创建一个 skill 项目
- 用统一模型定义 skill 和 tool
- 生成 agent 可读的 `skill/` 产物
- 在本机接通、安装、挂载和发布 skill
- 在浏览器场景里录制真实操作，并把结果交给 AI 分析，进一步生成可复用的 tool

## 适合做什么

`cli-skill` 适合把一段可重复的能力收成一个 skill。

这类能力可以是：

- 浏览器自动化
- API 调用
- 文件或本地工具编排
- 面向某个业务系统的一组专用工具

当前仓库已经把浏览器能力作为第一类场景接进来了，包括：

- browser runtime
- browser recorder
- 录制结果落盘
- 面向“录制内容 + AI 分析 + 提示词 => tool”的工作流基础

## 核心模型

这个项目里有三个核心对象：

- `tool`
  - 真正执行动作的最小单元
- `skill`
  - 对 tools 的组织与说明
- `skill/`
  - 生成给 agent 使用的产物目录

一个标准 skill 项目包含两部分：

源码：

- `src/index.ts`
- `src/tools/*`
- `src/skill/*`

产物：

- `skill/SKILL.md`
- `skill/agents/openai.yaml`

也就是说，`src/skill/*` 是模板源目录，根目录 `skill/*` 是构建产物。

## 命令模型

`cli-skill` 分成三类命令：

平台命令：

- `cli-skill create <skillName> --cli-name <cliName>`
- `cli-skill list`
- `cli-skill install <skillName> [--packageName <packageName>]`
- `cli-skill uninstall <packageName>`
- `cli-skill config get [keyPath]`
- `cli-skill config set <keyPath> <value>`
- `cli-skill browser record`

当前 skill 目录命令：

- `cli-skill tools`
- `cli-skill run <toolName> [rawInput]`
- `cli-skill config get [keyPath]`
- `cli-skill config set <keyPath> <value>`
- `cli-skill config unset <keyPath>`
- `cli-skill build`
- `cli-skill mount [targetPath]`
- `cli-skill unmount [targetPath]`
- `cli-skill publish [--dry-run] [--tag <tag>]`

已注册 skill 执行命令：

- `cli-skill exec <skillName> <toolName> [rawInput]`

生成出来的 skill 仍然会保留自己的 bin，例如：

- `my-skill list`
- `my-skill run <tool>`
- `my-skill <tool>`

但它只是一个薄转发层。项目级命令仍然通过 `cli-skill` 使用。

## 浏览器录制

浏览器录制的入口是：

```bash
cli-skill browser record
```

录制会启动一个本地服务和一套受控浏览器，并提供：

- 悬浮操作区
- 录制页
- 用户行为记录
- 网络请求记录
- 关键帧快照

录制的目标不是简单回放，而是沉淀一份结构化的上下文，让 AI 能基于：

- 用户做了什么
- 页面发生了什么
- 请求发到了哪里

进一步分析哪些步骤适合收敛成一个 tool。

默认目录约定：

- 浏览器共享 storage：
  - `~/.cli-skill/browser/storage`
- 浏览器录制结果：
  - `~/.cli-skill/browser-recorder/<timestamp>`

这样浏览器录制和真正运行 browser tool 可以共享登录态。

## 快速开始

### 创建一个 skill

```bash
cli-skill create my-skill --cli-name my-skill
cd ./my-skill
bun install
cli-skill build
cli-skill mount
```

### 运行当前目录里的 tool

```bash
cli-skill run <tool-name> '{"foo":"bar"}'
```

### 执行一个已注册的 skill

```bash
cli-skill exec <skill-name> <tool-name> '{"foo":"bar"}'
```

### 开始一次浏览器录制

```bash
cli-skill browser record
```

## 本地目录约定

- 当前目录创建的 skill：
  - `./<skill-name>`
- 已安装 skill：
  - `~/.cli-skill/skills`
- 本地注册表：
  - `~/.cli-skill/registry.json`
- agent 默认目录：
  - `~/.agents/skills`
- 浏览器共享 storage：
  - `~/.cli-skill/browser/storage`
- 浏览器录制目录：
  - `~/.cli-skill/browser-recorder`

## 仓库组成

- `skill`
  - 这个仓库自己的 agent skill 与参考资料
- `packages/cli`
  - 平台 CLI，负责 create、build、install、mount、publish、record 等命令
- `packages/core`
  - `defineSkill`、`defineTool`、plugin runtime、tool 执行模型
- `packages/browser-recorder`
  - 浏览器录制服务、录制页和录制产物
- `packages/templates`
  - 新 skill 项目的模板

## 开发

```bash
bun run bootstrap
bun run test
```
