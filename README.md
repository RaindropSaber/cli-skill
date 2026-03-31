# browser-skill

`browser-skill` 是一个用于创建、开发、安装和分发 browser skill 的工具链。

它提供：

- `@browser-skill/cli`
  - 初始化 skill 项目
  - 本地 link / unlink
  - 全局 install / uninstall
  - `sync-skill` 同步 `SKILL.md` 中的 Tool / Config 引用区块
- `@browser-skill/core`
  - `defineSkill`
  - `defineTool`
  - browser runtime
  - config / docs / result helpers
- `@browser-skill/templates`
  - skill 项目模板

生成出来的 skill 是一个独立包，默认包含：

- `bin/`
- `skill/`
- `src/`

并且可以：

- 作为本地 CLI 运行
- 通过 `browser-skill link` 注册到 `~/.agents/skills/<skill-name>`
- 后续发布后再通过 `browser-skill install` 安装

## 快速开始

```bash
browser-skill init my-skill --cli-name my-skill
cd ~/.browser-skill/skills/my-skill
npm install
browser-skill link
browser-skill sync-skill --write
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
