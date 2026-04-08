---
name: cli-skill
description: 当任务是创建、修改、安装、挂载、发布技能项目，或把一段浏览器流程沉淀成工具时，使用 cli-skill。
---

# cli-skill

这个技能用于把一段能力整理成 agent 可复用的技能项目，或者维护一个已有的技能项目。

当用户要做下面这些事时，优先使用 `cli-skill`：

- 创建一个新的技能项目
- 修改一个已有技能
- 把一段浏览器操作、网站流程或业务流程沉淀成工具
- 把现有能力整理成 agent 可复用的技能
- 安装、挂载、发布或配置一个技能项目

典型触发语句包括：

- “帮我做一个查询百度热搜的技能”
- “把这个网站操作录下来，做成工具”
- “给我新建一个技能项目”
- “把这个流程沉淀成 agent 可调用的能力”
- “发布一下这个技能”

如果需要查看技能源码结构和 core API 参考，继续看：

- [技能源码参考](references/skill-source.md)

如果任务涉及浏览器录制结果，以及“录制 -> 工具”的沉淀过程，继续看：

- [从录制到工具](references/recording-to-tool.md)

## 核心原则

### 先建项目，再补能力

如果用户要的是一个新技能，先用 `cli-skill create` 建立项目骨架，再实现工具和文档。不要跳过项目结构，直接散着写脚本。

### 浏览器场景先录制

如果用户要的是浏览器里的真实操作流程，默认不要直接猜 DOM 脚本，而是：

1. 用 `cli-skill browser record` 录一段真实操作
2. 先分析录制结果
3. 再决定沉淀成一个工具还是多个工具
4. 最后才生成工具

### 浏览器工具失败后先复盘

如果一个浏览器工具执行失败，而且这次运行带了浏览器记录，不要先盲改代码。

默认顺序应该是：

1. 先看错误里返回的 `recordingDir` 和 `summaryPath`
2. 先读 `summary.json`
3. 再读 `timeline.jsonl`
4. 只在需要更多上下文时，再按时间线里的 id 去查明细
5. 先判断失败更像：
   - 选择器问题
   - 页面时序问题
   - 登录态问题
   - 页面结构变化问题
6. 再决定是调整参数、补等待、改定位方式，还是换成接口方案

### 先分析流程，再写工具

拿到录制结果后，先回答：

- 用户做了什么
- 哪些步骤值得沉淀
- 这应该是一个工具还是多个工具
- 哪些字段该做成参数
- 成功判定是什么

没有这一步，后面写出来的工具通常会过度拟合这一次录制。

### 最后一定补技能文档

新技能完成后，最后一步必须补完整 `src/skill/SKILL.md`，至少说明：

- 这个技能解决什么问题
- 什么时候该用它
- 典型流程是什么
- 工具的输入、输出和关键约束是什么

不要只停在模板默认的最小占位内容。

### 配置由文件层级覆盖，不由平台偷偷隔离

`cli-skill` 的配置行为应该按统一 key 空间来理解：

- 全局：
  - `~/.cli-skill-config.json`
- 本地：
  - 当前目录及父目录里的 `.cli-skill-config.json`

平台不会再自动把配置写成：

- `skillConfig.<skillName>.*`

如果某个技能要做自己的配置隔离，应该由这个技能自己定义 key，例如：

- `mySkill.baseUrl`
- `mySkill.env`
- `mySkill.keyword`

## 默认流程

### 情况一：新建技能

当用户要新建一个技能时，默认流程是：

```bash
cli-skill create <skill-name> --cli-name <cli-name>
cd ./<skill-name>
bun install
```

然后按下面顺序继续：

1. 明确这个技能要解决什么任务
2. 如果是浏览器场景，先录制
3. 实现工具
4. 补 `src/skill/*` 文档模板
5. 执行 `cli-skill build`
6. 执行 `cli-skill mount`

如果没有提供 `cli-name`，默认令它等于 `skill-name`。

### 情况二：浏览器流程沉淀

如果用户要把一段浏览器操作沉淀成工具，默认流程是：

1. 启动 `cli-skill browser record`
2. 持续等待录制命令结束
3. 先读 `summary.json`
4. 再读 `timeline.jsonl`
5. 需要更多上下文时，再按时间线里的 `actionId`、`networkId`、`domSnapshotId` 去查：
   - `actions.jsonl`
   - `network.jsonl`
   - `dom.jsonl`
6. 先写“用户做了什么”
7. 再判断适合沉淀成哪些工具
8. 再实现工具和技能文档

### 情况三：维护已有技能

如果用户要改一个已有技能，默认流程是：

1. 先读当前项目里的 `src/index.ts`、`src/tools/*`、`src/skill/*`
2. 确认是在改工具、改文档，还是改项目工作流
3. 修改后重新执行 `cli-skill build`
4. 如果需要给 agent 用，再执行 `cli-skill mount`

### 情况四：浏览器工具失败后的默认处理

如果浏览器工具执行失败，并且错误里已经带了本次运行记录：

1. 先读本次运行的 `summary.json`
2. 再读 `timeline.jsonl`
3. 按需展开：
   - `actions.jsonl`
   - `network.jsonl`
   - `dom.jsonl`
4. 先解释失败点出现在什么时间线位置
5. 再修改工具或配置
6. 最后重试

## 命令分层

处理技能项目时，默认按三类命令来理解。

### 平台命令

- `cli-skill create`
- `cli-skill list`
- `cli-skill tools <skill-name>`
- `cli-skill install`
- `cli-skill uninstall`
- `cli-skill config ...`
- `cli-skill browser record`

### 当前目录命令

- `cli-skill tools`
- `cli-skill run`
- `cli-skill build`
- `cli-skill mount`
- `cli-skill publish`

### 已注册技能执行命令

- `cli-skill exec <skill-name> ...`

### 技能 bin

技能自己的 bin 只是一个转发入口：

- `skill-name list`
  - 查看这个技能的工具列表
- `skill-name <tool>`
  - 执行这个技能里的工具

项目级命令仍然通过 `cli-skill` 使用，不通过技能 bin 使用。

## 项目结构

默认技能项目结构：

- `src/index.ts`
- `src/tools/*`
- `src/skill/*`

含义：

- `src/index.ts`
  - 技能定义入口
- `src/tools/*`
  - 工具源码
- `src/skill/*`
  - 文档模板源目录

执行 `cli-skill build` 会生成：

- `skill/SKILL.md`
- `skill/agents/openai.yaml`

## 关键规则

- `create` 只创建项目，不会自动安装依赖，也不会自动挂载。
- `build` 负责把 `src/skill/*` 渲染成根目录 `skill/*`。
- `mount` 负责：
  - 接通技能的 bin
  - 注册根目录 `skill/` 到 agent 目录
- `mount` 不应隐式执行 `install`。
- `install` / `uninstall` 面向已发布技能。
- `publish` 只针对当前目录的本地技能。
- `install` 直接接受包名。
- `install` 只负责：
  - 安装包
  - 写本机注册表
  - 接通技能 bin
- 如果要让 agent 直接使用一个已安装技能，安装后还需要再执行一次 `mount`。
- 技能 bin 只负责：
  - `list`
  - 直接执行工具
  - `config get/set/unset`
- 浏览器工作目录默认在：
  - `~/.cli-skill/browser/user-data`
- 浏览器同步来源目录默认是本机 Chrome 的：
  - `~/Library/Application Support/Google/Chrome/Default`
- 浏览器录制结果默认在：
  - `~/.cli-skill/browser-recorder`
- 如果全局或目录配置里打开了：
  - `recordBrowserRun`
  - 那么浏览器工具执行时也会在当前技能的 `storage/browser-runs/` 下留下本次运行记录
- `cli-skill browser record` 是一个长任务：
  - 启动后打印的 session 信息只是中间态
  - 如果是 agent 自己启动了这条命令，就必须持续等待这个进程退出
  - 不能在看到 session 信息后提前结束当前回合
  - 命令结束后返回的 JSON 才是完成信号
  - 返回结果里的 `stopReason` 用来判断是正常停止还是中断
  - 只有适合继续的退出原因，才进入后续分析
  - 后续分析默认先看 `summary.json` 和 `timeline.jsonl`
  - `timeline.jsonl` 是主入口，其他三份明细通过 `actionId`、`networkId`、`domSnapshotId` 按需展开
- 浏览器工具执行失败时：
  - 如果错误里已经带了 `recordingDir` 和 `summaryPath`
  - 默认先复盘这次运行记录，再调整工具
- `config get` 默认读合并后的最终结果
- `config set` 默认写最近的本地 `.cli-skill-config.json`
- `config set --global` 才写 `~/.cli-skill-config.json`

## 常用命令

| 场景 | 命令 |
| --- | --- |
| 创建技能 | `cli-skill create <skill-name> --cli-name <cli-name> [--template <templateName>]` |
| 查看技能列表 | `cli-skill list` |
| 查看已注册技能的工具列表 | `cli-skill tools <skill-name>` |
| 安装已发布技能 | `cli-skill install <package-name> [--registry <registry>]` |
| 卸载已发布技能 | `cli-skill uninstall <package-name>` |
| 查看工具列表 | `cli-skill tools` |
| 运行当前目录工具 | `cli-skill run <tool-name> [rawInput]` |
| 运行已注册技能的工具 | `cli-skill exec <skill-name> <tool-name> [rawInput]` |
| 读取当前技能配置 | `cli-skill config get [keyPath]` |
| 写入当前技能配置 | `cli-skill config set <keyPath> <value>` |
| 删除当前技能配置 | `cli-skill config unset <keyPath>` |
| 挂载当前技能 | `cli-skill mount [targetPath]` |
| 取消挂载当前技能 | `cli-skill unmount [targetPath]` |
| 构建技能产物 | `cli-skill build` |
| 发布当前技能 | `cli-skill publish [--dry-run] [--tag <tag>] [--registry <registry>]` |

## 已发布技能的安装心智

安装已发布技能时，直接使用包名，例如：

- `cli-skill install @your-scope/cli-skill-demo`
- `cli-skill install @your-scope/cli-skill-demo --registry https://registry.example.com/`

安装完成后：

1. 包会被放进 `~/.cli-skill/skills/<skill-name>`
2. 本机注册表会记录这个技能
3. 技能自己的 bin 会被接通
4. 如果要给 agent 使用，还要再执行：
   - `cli-skill mount <skill-name>`

## 默认目录

- 当前目录创建的技能：
  - `./<skill-name>`
- 已安装技能：
  - `~/.cli-skill/skills/<skill-name>`
- 本地注册表：
  - `~/.cli-skill/registry.json`
- agent 默认目录：
  - `~/.agents/skills/<skill-name>`

## 配置

全局配置文件：

- `~/.cli-skill-config.json`

配置按层级文件合并，不自动按技能名做隔离：

- 全局：`~/.cli-skill-config.json`
- 本地：逐级向上查找 `.cli-skill-config.json`
- 如果某个技能需要隔离自己的配置，应该自己约定 key，例如 `mySkill.baseUrl`

## 不要做的事

- 不要把 `create` 当成“已经可执行”
- 不要手动改 `~/.agents/skills`
- 不要把技能 bin 当成独立平台
- 不要期待技能 bin 提供 `build` / `mount` / `publish`
- 不要在修改已有技能时重新 `create`
