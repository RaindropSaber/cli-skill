# cli-skill

`cli-skill` 是一套把可重复流程沉淀成 agent 可用技能的工具链。

它解决的是一整条链路：

- 从零创建一个技能项目
- 在本地实现和调试工具
- 生成 agent 可读的 `skill/` 产物
- 安装、挂载、发布技能
- 在浏览器场景里录制真实操作，再交给 AI 分析并整理成工具

## 亮点

### 统一的技能项目模型

所有技能项目都围绕同一套结构工作：

- `src/index.ts` 定义技能
- `src/tools/*` 实现工具
- `src/skill/*` 维护文档模板
- 根目录 `skill/*` 生成最终产物

这让新技能、已有技能维护、技能发布都能走同一套流程。

### 本地到 agent 的完整闭环

`cli-skill` 不只是脚手架。它还负责：

- 管理本机技能注册表
- 安装和卸载已发布技能
- 挂载技能到 agent 目录
- 通过统一命令执行工具

这样一个技能从本地开发到真正给 agent 使用，中间不需要再拼额外流程。

### 浏览器录制优先

浏览器场景不需要一开始就猜脚本。

`cli-skill browser record` 可以先录下真实操作，再保留：

- 用户行为明细
- 网络请求明细
- DOM 变化明细
- 以 `timeline.jsonl` 为主线的时间线

默认读法是：

1. 先看 `summary.json`
2. 再看 `timeline.jsonl`
3. 需要更多上下文时，再按时间线里的 `actionId`、`networkId`、`domSnapshotId` 去查对应明细

这些结果可以继续交给 AI，用来判断哪些步骤值得沉淀成工具，哪些更适合 DOM 自动化，哪些更适合直接走接口。

### 适合持续演进

这个仓库不是围绕某一个业务技能写死的。它更适合搭建一套长期可维护的技能体系，例如：

- 浏览器自动化技能
- API 编排技能
- 本地文件或命令工具技能
- 面向具体业务系统的一组专用技能

## 适合谁

`cli-skill` 适合这些人：

- 想把一段重复流程做成 agent 可用技能的人
- 想维护一组内部业务工具的人
- 想先录制浏览器操作，再逐步沉淀成工具的人
- 想把技能项目本地开发、发布和挂载接在一起的人

## 项目结构

- `packages/cli`
  - 平台命令入口。负责创建项目、构建产物、安装、挂载、发布、录制等工作流。
  - 说明见 [packages/cli/README.md](./packages/cli/README.md)
- `packages/core`
  - 技能定义、工具定义、插件能力和运行时模型。
  - 说明见 [packages/core/README.md](./packages/core/README.md)
- `packages/browser-recorder`
  - 浏览器录制宿主、悬浮窗注入和录制产物。
  - 说明见 [packages/browser-recorder/README.md](./packages/browser-recorder/README.md)
- `packages/templates`
  - 新技能项目模板。
  - 说明见 [packages/templates/README.md](./packages/templates/README.md)
- `packages/cli/skill`
  - `cli-skill` 自己的技能说明与参考资料，供 agent 使用。

## 安装

```bash
npm i -g bun
bun add -g @cli-skill/cli
```

安装完成后，再执行一条 shell 命令，把安装包里的 `skill/` 目录链接到 `~/.agents/skills/cli-skill`。这样 agent 才能在后续对话里直接加载并使用这份 `cli-skill` 技能说明：

```bash
mkdir -p ~/.agents/skills && CLI_SKILL_DIR="$(cd "$(dirname "$(realpath "$(command -v cli-skill)")")/.." && pwd)" && ln -sfn "$CLI_SKILL_DIR/skill" ~/.agents/skills/cli-skill
```

这样后续 agent 就能直接使用 `cli-skill` 这份技能。

## 快速开始

```bash
cli-skill create my-skill --cli-name my-skill
cd ./my-skill
bun install
cli-skill build
cli-skill mount
```

浏览器录制：

```bash
cli-skill browser record
```

如果你希望浏览器工具执行失败后也能复盘本次运行过程，可以在全局或项目目录的 `.cli-skill-config.json` 里打开：

```json
{
  "recordBrowserRun": true
}
```

如果你想把本机 Chrome 里一部分状态同步到 `cli-skill` 使用的浏览器目录，可以手动执行：

```bash
cli-skill browser sync
```

## 开发

在本地开发这个仓库时，可以这样接通本地 CLI：

```bash
bun install
cd ./packages/cli
bun link
```

常用开发命令：

```bash
bun run bootstrap
bun run test
```
