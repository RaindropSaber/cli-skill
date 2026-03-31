# cli-skill

`cli-skill` 是一个用于创建、开发、安装和分发 cli skill 的工具链。

它提供：

- `@cli-skill/cli`
  - 创建 skill 项目
  - 本地 enable / disable
  - 托管 install / uninstall
  - publish 本地 skill 包
  - `list` 列出本地与已安装 skill
  - `sync-skill` 同步 `SKILL.md` 中的 Tool / Config 引用区块
- `@cli-skill/core`
  - `defineSkill`
  - `defineTool`
  - browser runtime
  - config / docs / result helpers
- `@cli-skill/templates`
  - 内置 `basic` 模板

生成出来的 skill 是一个独立包，默认包含：

- `bin/`
- `skill/`
- `src/`

并且可以：

- 作为本地 CLI 运行
- 通过 `cli-skill enable` 将 bin 接到 Bun 全局 bin，并将 `skill/` 注册到 `~/.agents/skills/<skill-name>`
- 通过 `cli-skill install` 安装到 `~/.cli-skill/installed`
- `install` 默认接收 skill 名；CLI 会通过 npm search API 按 `cli-skill` 和 skill 名关键词查找唯一包
- 也支持 `i` 作为 `install` 的简写

## 快速开始

```bash
cli-skill create my-skill --cli-name my-skill
bun install
cli-skill enable my-skill
cli-skill sync-skill --write
```

## Monorepo

- `packages/cli`
- `packages/core`
- `packages/templates`

## 开发

```bash
bun run bootstrap
bun run check
```

## 目录约定

- 本地开发中的 skill:
  - `~/.cli-skill/skills`
- cli-skill 托管安装的 skill:
  - `~/.cli-skill/installed`
- agent 读取 skill 的默认目录:
  - `~/.agents/skills`

## install 规则

- `cli-skill install fx`
  - 先按 skill 名 `fx` 搜索带有关键字 `cli-skill` 和 `fx` 的包
  - 只有唯一命中时才会安装
- `cli-skill install fx --packageName @scope/cli-skill-fx`
  - 直接按显式包名安装
- `cli-skill i fx`
  - 等价于 `cli-skill install fx`

## publish 规则

- `cli-skill publish fx`
  - 从 `~/.cli-skill/skills/fx` 找到本地 skill 项目
  - 在该目录执行 `bun publish`
- `cli-skill publish fx --dry-run`
  - 用于发布前检查包内容
