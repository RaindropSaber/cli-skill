# @cli-skill/browser-recorder

`@cli-skill/browser-recorder` 是 `cli-skill` 的浏览器录制能力包。

它不是脚本回放器，而是把一段真实浏览器操作整理成一份可分析的录制结果。后续可以基于这份结果继续判断：这是不是一个值得沉淀的流程，应该做成一个工具还是多个工具，以及更适合 DOM 自动化还是接口调用。

## 这个包负责什么

- 启动本地录制服务
- 打开受控浏览器
- 注入录制悬浮操作区
- 落盘行为、请求、DOM 快照、关键帧和时间线
- 提供本地 review 页

## 使用方式

通常通过平台命令启动：

```bash
cli-skill browser record
```

启动后会：

- 启动本地服务
- 打开录制页
- 在浏览器里提供悬浮操作区

悬浮操作区当前包括：

- `开始 / 停止`
- `打开录制页`
- `关键帧`
- `收起 / 展开`

## 录制结果包含什么

- 用户行为
- 网络请求
- DOM 快照
- 关键帧
- 时间线

这些数据会一起回答几个问题：

- 用户在页面里做了什么
- 页面结构在哪些节点发生了变化
- 哪些请求值得继续利用
- 哪些步骤值得沉淀成工具

## 录制目录

默认录制目录：

- `~/.cli-skill/browser-recorder/<timestamp>/`

当前会生成：

- `meta.json`
- `summary.json`
- `actions.jsonl`
- `network.jsonl`
- `dom-snapshots.json`
- `timeline.json`
- `keyframes.json`
- `dom/*.html`
- `assets/*`

## 共享浏览器状态

录制和浏览器工具默认共享同一份浏览器 storage：

- `~/.cli-skill/browser/storage`

默认登录态文件：

- `~/.cli-skill/browser/storage/.auth/user.json`

如果上层配置覆盖了 `browserStorageRoot`，录制器会跟着使用新的路径。

## review 页

录制结束后，可以用本地 review 页查看：

- 时间线
- 用户行为
- 网络请求
- DOM 快照
- 关键帧

它的用途是帮助开发者或 AI 快速理解这次流程，而不是做复杂的录制编辑。

## 边界

这个包当前更适合做：

- 真实浏览器流程的取样
- 结构化上下文落盘
- 为后续工具设计提供素材

它当前不追求：

- 一比一脚本回放
- 完整可视化编辑器
- 单独自动生成最终工具
