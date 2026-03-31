---
name: browser-skill-creator
description: 当需要创建、接通、安装或维护 browser skill 时，使用 browser-skill CLI 完成标准流程。
---

# browser-skill-creator

当用户要创建一个新的 browser skill，接通本地开发中的 skill，安装一个已发布的 skill，或者维护 browser-skill 的全局配置时，使用这个 skill。

## 何时使用

- 用户说“创建一个 browser skill”
- 用户要把一个本地 skill 接成可直接执行的 CLI
- 用户要安装或卸载一个已发布的 browser skill
- 用户要查看或修改 `~/.browser-skill/config.json`
- 用户要更新某个 skill 的 `SKILL.md` 中的 Tool / Config 文档区块

## 默认流程

如果用户要新建一个 skill，默认按下面顺序执行：

```bash
browser-skill init <skill-name> --cli-name <cli-name>
cd ~/.browser-skill/skills/<skill-name>
npm install
browser-skill link
browser-skill sync-skill --write
```

如果用户没有指定 `cli-name`，默认令它等于 `skill-name`。

## 命令对照

| 场景 | 命令 |
| --- | --- |
| 创建 skill | `browser-skill init <skill-name> --cli-name <cli-name>` |
| 接通本地 skill | 在 skill 根目录执行 `browser-skill link` |
| 取消本地接通 | 在 skill 根目录执行 `browser-skill unlink` |
| 安装已发布 skill | `browser-skill install <package-spec>` |
| 卸载已发布 skill | `browser-skill uninstall <package-name>` |
| 同步 skill 文档 | 在 skill 根目录执行 `browser-skill sync-skill --write` |
| 读取配置 | `browser-skill config get [keyPath]` |
| 写入配置 | `browser-skill config set <keyPath> <value>` |

## 关键规则

- `init` 只创建项目，不会自动执行 `npm install`，也不会自动注册 CLI。
- `link` 只做两件事：
  - 执行 `npm link`
  - 把当前 skill 的 `./skill` 注册到 `~/.agents/skills/<skill-name>`
- `install` / `uninstall` 面向已发布 skill：
  - `install` 背后执行 `npm install -g`
  - `uninstall` 背后执行 `npm uninstall -g`
- skill 项目默认创建在：
  - `~/.browser-skill/skills/<skill-name>`
- agent 读取 skill 的目录默认是：
  - `~/.agents/skills/<skill-name>`
- 包名可以带 `browser-skill-` 前缀，但 agent 使用的 skill 名不带这个前缀。
- 如果用户只是要修改某个已有 skill，不要重新 `init`，直接进入现有 skill 目录工作。

## 配置规则

- 全局配置文件是：
  - `~/.browser-skill/config.json`
- 通过下面命令读写：

```bash
browser-skill config get
browser-skill config get skillConfig.fx
browser-skill config set skillConfig.fx.baseUrl https://example.com
```

- `get` / `set` 支持点路径，如：
  - `skillConfig.fx.baseUrl`
  - `skillConfig.fx.env.TEST_VALUE`

## 文档同步规则

- skill 的 `SKILL.md` 里，`Tool Reference` 和 `Config Reference` 应由平台命令生成。
- 当工具或配置发生变化后，优先执行：

```bash
browser-skill sync-skill --write
```

- 不要手写维护这两个生成区块，除非用户明确要求。

## 不要做的事

- 不要把 `init` 当成“已经可执行”
- 不要让 `link` 隐式执行 `install`
- 不要手动改 `~/.agents/skills`，优先通过 `browser-skill` CLI 管理
- 不要把测试 skill 长期留在工作区；测试时统一使用 `test-skill-1`、`test-skill-2` 这类名字
