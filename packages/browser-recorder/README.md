# @cli-skill/browser-recorder

`@cli-skill/browser-recorder` 是 `cli-skill` 的浏览器录制能力包。

它不是脚本回放器，而是一个“悬浮提示条 + Playwright 宿主”的轻量录制器。用户在真实浏览器里操作，录制器把行为、请求、DOM 变化和时间线落盘，供后续 AI 或开发者继续分析。

## 这个包负责什么

- 打开受控浏览器
- 注入录制悬浮操作区
- 落盘行为、请求、DOM 变化和时间线
- 在录制结束后返回本次录制结果路径

## 源码分层

这个包现在按几层职责拆开：

- `src/host`
  放录制宿主入口，只负责组装浏览器、会话、collector 和 store。
- `src/session`
  放录制会话状态机。
- `src/bridge`
  放注入页面的悬浮提示脚本、脚本组装逻辑和页面到宿主的 binding 协议。
  其中 `bridge/runtime/*` 是可直接阅读和维护的脚本片段，`bridge/build-recorder-script.ts` 负责把它们组装成最终注入脚本。
- `src/collectors`
  放行为、网络、页面、DOM 快照等采集器。
- `src/storage`
  放录制目录和各类记录的落盘逻辑。
- `src/summary`
  放时间线和摘要这类派生产物。
- `src/model`
  放录制数据结构定义。
- `src/utils`
  放少量与业务无关的辅助函数。

## 使用方式

通常通过平台命令启动：

```bash
cli-skill browser record
```

启动后会直接打开浏览器，并在页面里注入一个悬浮提示条。

录制会在浏览器打开后立即开始，关闭浏览器就是结束录制。

## 录制结果包含什么

- `summary.json`
- `timeline.jsonl`
- `actions.jsonl`
- `network.jsonl`
- `dom.jsonl`

默认阅读顺序是：

1. 先看 `summary.json`
2. 再看 `timeline.jsonl`
3. 需要更多上下文时，再按时间线里的 id 去查三份明细：
   - `actionId` -> `actions.jsonl`
   - `networkId` -> `network.jsonl`
   - `domSnapshotId` -> `dom.jsonl`

这些数据会一起回答几个问题：

- 用户在页面里做了什么
- 页面在哪些节点发生了变化
- 哪些请求值得继续利用
- 哪些步骤值得沉淀成工具

## 录制目录

默认录制目录：

- `~/.cli-skill/browser-recorder/<timestamp>/`

当前会生成这五个主文件：

- `summary.json`
- `timeline.jsonl`
- `actions.jsonl`
- `network.jsonl`
- `dom.jsonl`

## 共享浏览器目录

录制和浏览器工具默认共享同一份浏览器用户目录：

- `~/.cli-skill/browser/user-data`

如果你想手动把本机 Chrome 里的部分状态同步过来，可以通过 `@cli-skill/cli` 提供的：

- `cli-skill browser sync`

来把白名单里的关键文件同步进这份目录。录制器和浏览器工具之后都会继续使用同一个 `browserUserDataDir`。

如果上层配置覆盖了这些路径，录制器会跟着使用新的位置：

- `browserUserDataDir`
- `browserSourceUserDataDir`

## 边界

这个包当前更适合做：

- 真实浏览器流程的取样
- 结构化上下文落盘
- 为后续工具设计提供素材

它当前不追求：

- 一比一脚本回放
- 完整页面化 CRUD 后台
- 单独自动生成最终工具
