---
name: cli-skill-creator
description: 当需要创建、接通、安装或维护 cli skill 时，使用 cli-skill CLI 完成标准流程。
---

# cli-skill-creator

当用户要创建一个新的 cli skill，接通本地开发中的 skill，安装一个已发布的 skill，或者维护 cli-skill 的全局配置时，使用这个 skill。

## 何时使用

- 用户说“创建一个 cli skill”
- 用户要把一个本地 skill 接成可直接执行的 CLI
- 用户要安装或卸载一个已发布的 cli skill
- 用户要查看或修改 `~/.cli-skill/config.json`
- 用户要更新某个 skill 的 `SKILL.md` 中的 Tool / Config 文档区块

## 默认流程

如果用户要新建一个 skill，默认按下面顺序执行：

```bash
cli-skill create <skill-name> --cli-name <cli-name>
bun install
cli-skill enable <skill-name>
cli-skill sync-skill --write
```

如果用户没有指定 `cli-name`，默认令它等于 `skill-name`。

## 命令对照

| 场景 | 命令 |
| --- | --- |
| 创建 skill | `cli-skill create <skill-name> --cli-name <cli-name> [--template <templateName>]` |
| 激活本地 skill | `cli-skill enable <skill-name> [--agentPath <path>]` |
| 取消激活本地 skill | `cli-skill disable <skill-name> [--agentPath <path>]` |
| 安装已发布 skill | `cli-skill install <skill-name>` |
| 卸载已发布 skill | `cli-skill uninstall <package-name>` |
| 发布本地 skill | `cli-skill publish <skill-name> [--dry-run]` |
| 查看 skill 列表 | `cli-skill list` |
| 同步 skill 文档 | 在 skill 根目录执行 `cli-skill sync-skill --write` |
| 读取配置 | `cli-skill config get [keyPath]` |
| 写入配置 | `cli-skill config set <keyPath> <value>` |

## 关键规则

- `create` 会通过 `bunx` 调 templates 包创建 skill 项目。
- 默认模板名是 `basic`，对应 templates 包里的内置基础模板。
- `create` 只创建项目，不会自动执行 `bun install`，也不会自动注册 CLI。
- `enable` 只做两件事：
  - 把目标 skill 的 bin 接到 Bun 全局 bin
  - 把目标 skill 的 `./skill` 注册到目标 skill 目录，默认是 `~/.agents/skills/<skill-name>`
- `enable` / `disable` 都通过 `skill-name` 到 `~/.cli-skill/skills/<skill-name>` 查找本地 skill 项目
- `install` / `uninstall` 面向已发布或已打包的 skill：
  - `install` 会把 skill 安装到 `~/.cli-skill/installed`
  - 同时把 bin 接到 Bun 全局 bin
  - 同时把 `skill/` 注册到目标 skill 目录，默认是 `~/.agents/skills/<skill-name>`
- `install <skill-name>` 会先按 skill 名去 npm search API 查找：
  - 搜索条件包含 `cli-skill` 和 `<skill-name>`
  - 只有唯一命中时才会安装
- `install <skill-name> --packageName <package-name>` 会直接按显式包名安装
- `i` 是 `install` 的简写
- `publish <skill-name>` 会从 `~/.cli-skill/skills/<skill-name>` 找到本地 skill 项目，并执行 `bun publish`
- skill 项目默认创建在：
  - `~/.cli-skill/skills/<skill-name>`
- 托管安装的 skill 默认放在：
  - `~/.cli-skill/installed`
- agent 读取 skill 的目录默认是：
  - `~/.agents/skills/<skill-name>`
- 包名可以带 `cli-skill-` 前缀，但 agent 使用的 skill 名不带这个前缀。
- 如果用户只是要修改某个已有 skill，不要重新 `create`，直接进入现有 skill 目录工作。

## 配置规则

- 全局配置文件是：
  - `~/.cli-skill/config.json`
- 通过下面命令读写：

```bash
cli-skill config get
cli-skill config get skillConfig.fx
cli-skill config set skillConfig.fx.baseUrl https://example.com
```

- `get` / `set` 支持点路径，如：
  - `skillConfig.fx.baseUrl`
  - `skillConfig.fx.env.TEST_VALUE`

## 文档同步规则

- skill 的 `SKILL.md` 里，`Tool Reference` 和 `Config Reference` 应由平台命令生成。
- 当工具或配置发生变化后，优先执行：

```bash
cli-skill sync-skill --write
```

- 不要手写维护这两个生成区块，除非用户明确要求。

## 不要做的事

- 不要把 `create` 当成“已经可执行”
- 不要让 `enable` 隐式执行 `install`
- 不要手动改 `~/.agents/skills`，优先通过 `cli-skill` CLI 管理
- 不要把测试 skill 长期留在工作区；测试时统一使用 `test-skill-1`、`test-skill-2` 这类名字
