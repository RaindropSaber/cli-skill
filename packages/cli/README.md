# @cli-skill/cli

`@cli-skill/cli` 是 `cli-skill` 的平台命令入口。

如果说整个项目解决的是“怎么把一个流程做成技能”，这个包解决的就是其中的工作流部分：创建项目、构建产物、安装技能、挂载技能、发布技能，以及启动浏览器录制。

## 安装

```bash
npm i -g bun
bun add -g @cli-skill/cli
```

安装完成后，再执行一条 shell 命令，把安装包里的 `skill/` 目录链接到 `~/.agents/skills/cli-skill`。这样 agent 才能在后续对话里直接加载并使用这份 `cli-skill` 技能说明：

```bash
mkdir -p ~/.agents/skills && CLI_SKILL_DIR="$(cd "$(dirname "$(realpath "$(command -v cli-skill)")")/.." && pwd)" && ln -sfn "$CLI_SKILL_DIR/skill" ~/.agents/skills/cli-skill
```

## 这个包负责什么

- 创建新的技能项目
- 在当前技能目录里执行构建、运行和发布命令
- 维护本机技能注册表
- 安装和卸载已发布技能
- 挂载和取消挂载技能
- 读写 `~/.cli-skill-config.json`，并向上合并目录中的 `.cli-skill-config.json`
- 启动浏览器录制
- 手动同步浏览器用户目录
- 把录制结果整理成 `summary + timeline + 明细` 这套统一产物
- 在浏览器工具失败时，保留可复盘的本次运行记录

## 配置行为

`@cli-skill/cli` 只负责：

- 找到全局配置文件
- 向上合并目录里的本地配置文件
- 处理 `config get/set/unset` 的读写作用域

它不会在平台层自动把配置包成“某个技能自己的命名空间”。

也就是说：

- 全局文件：
  - `~/.cli-skill-config.json`
- 本地文件：
  - 当前目录或父目录里的 `.cli-skill-config.json`

它们共享同一套 key 空间。某个技能如果想隔离自己的配置，应该自己约定 key，例如：

- `mySkill.baseUrl`
- `mySkill.env`
- `mySkill.keyword`

## 安装与发布

安装已发布技能时，直接使用包名。

例如：

```bash
cli-skill install @your-scope/cli-skill-demo
cli-skill install @your-scope/cli-skill-demo --registry https://registry.example.com/
```

`publish` 也支持显式指定 registry：

```bash
cli-skill publish --registry https://registry.example.com/
```

安装完成后，如果要让 agent 直接使用这个技能，还需要再执行一次 `cli-skill mount <skill-name>`。

## 常见命令

### 平台命令

```bash
cli-skill create <skillName> --cli-name <cliName> [--template <templateName>]
cli-skill list
cli-skill tools <skillName>
cli-skill install <packageName> [--registry <registry>]
cli-skill uninstall <packageName>
cli-skill config get [keyPath]
cli-skill config set <keyPath> <value>
cli-skill exec <skillName> <toolName> [rawInput]
cli-skill browser record
cli-skill browser sync
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
cli-skill publish [--dry-run] [--tag <tag>] [--registry <registry>]
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

如果这个技能包含浏览器工具，并且配置里打开了：

```json
{
  "recordBrowserRun": true
}
```

那么每次浏览器工具执行都会在 `~/.cli-skill/browser-runs/` 下沉淀一份本次运行记录。

### 安装一个已发布技能并挂给 agent

```bash
cli-skill install @your-scope/cli-skill-demo
cli-skill mount demo
```

`install` 只会：

- 把包安装到 `~/.cli-skill/skills`
- 写入本机注册表
- 接通技能 bin

如果要让 agent 直接使用这个技能，还需要再执行一次 `mount`。

### 执行一个已注册技能的工具

```bash
cli-skill exec <skill-name> <tool-name> '{"foo":"bar"}'
```

如果工具失败，而且错误里已经带了：

- `recordingDir`
- `summaryPath`

默认先复盘这次运行记录，再改工具。

### 开始一次浏览器录制

```bash
cli-skill browser record
```

录制结束后，默认先看：

- `summary.json`
- `timeline.jsonl`

再按 `timeline.jsonl` 里的：

- `actionId`
- `networkId`
- `domSnapshotId`

去读：

- `actions.jsonl`
- `network.jsonl`
- `dom.jsonl`

### 浏览器工具失败后的默认处理

如果浏览器工具执行失败，并且这次运行开启了 `recordBrowserRun`，默认按这个顺序处理：

1. 先看错误里返回的 `recordingDir` 和 `summaryPath`
2. 先读 `summary.json`
3. 再读 `timeline.jsonl`
4. 只有在需要更多上下文时，再去查：
   - `actions.jsonl`
   - `network.jsonl`
   - `dom.jsonl`
5. 先判断更像：
   - 选择器问题
   - 页面时序问题
   - 登录态问题
   - 页面结构变化问题
6. 再调整工具

### 手动同步浏览器用户目录

```bash
cli-skill browser sync
```

这个同步能力属于 `@cli-skill/cli` 自己的工作流能力，不属于 `browser-recorder` 宿主本身。

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
- 浏览器工作目录：
  - `~/.cli-skill/browser/user-data`
- 浏览器同步来源：
  - 默认会尝试读取本机 Chrome 的 `Default` 目录
- 浏览器录制结果：
  - `~/.cli-skill/browser-recorder`

## 配置文件

- 全局：
  - `~/.cli-skill-config.json`
- 本地：
  - 逐级向上查找 `.cli-skill-config.json`

默认读取会按层级合并。

默认写入时：

- `cli-skill config set ...`
  - 写最近的本地 `.cli-skill-config.json`
- `cli-skill config set ... --global`
  - 写 `~/.cli-skill-config.json`

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
