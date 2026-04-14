# 技能源码参考

这份参考页只解决一件事：

**当你已经知道要做什么工具时，源码应该怎么落地。**

它不负责讲：

- 什么时候该录制
- 录制结果怎么分析
- 流程该拆成一个工具还是多个工具

那些内容留在：

- [主技能说明](../SKILL.md)
- [从录制到工具](recording-to-tool.md)

## 什么时候看

适合在下面这些阶段看：

- 已经创建好了技能项目，准备开始写代码
- 已经知道要新增或修改哪个工具
- 已经完成录制分析，准备把结论落成代码
- 需要理解 `src/index.ts`、`src/tools/*`、`src/skill/*` 的分工

## 先看哪几个文件

一个技能项目，最常看的只有三类文件：

- `src/index.ts`
  - 技能入口
  - 管理工具列表、描述、概述、配置
- `src/tools/*`
  - 每个工具自己的实现
- `src/skill/*`
  - 给 agent 用的文档模板

先判断这次改动落在哪一层，再动手。

## 默认落地顺序

如果你已经知道要做什么工具，默认顺序是：

1. 先改 `src/tools/*`
2. 再改 `src/index.ts`
3. 再补 `src/skill/*`
4. 执行 `cli-skill build`
5. 如果需要给 agent 用，再执行 `cli-skill mount`

不要反过来先写一堆平台说明，或者把所有逻辑都塞进入口文件。

## 常见改动类型

### 新增一个工具

按这个顺序做：

1. 在 `src/tools/` 新建工具文件
2. 在 `src/index.ts` 引入并加入 `tools`
3. 在 `src/skill/SKILL.md` 补工具用途、典型流程和边界
4. 执行 `cli-skill build`

### 修改一个已有工具

按这个顺序做：

1. 找到对应的 `src/tools/<tool-name>.ts`
2. 只改这一个工具的输入、输出、逻辑或插件
3. 如果输入输出变了，再补 `src/skill/SKILL.md`
4. 执行 `cli-skill build`

### 只补文档

优先改：

- `src/skill/SKILL.md`
- 如果需要，也包括 `src/skill/agents/openai.yaml`

通常不需要改：

- `src/tools/*`

## 文件各自负责什么

### `src/index.ts`

这里负责：

- 定义技能
- 描述技能是什么
- 组织工具列表
- 声明配置 schema

这里不应该塞：

- 很长的工具实现
- 页面操作细节
- 大段文档正文

### `src/tools/*`

这里负责：

- 工具输入 schema
- 工具输出 schema
- 插件声明
- `run(input, ctx)` 的真正执行逻辑

这里不应该塞：

- 技能整体介绍
- 与其他工具无关的大段说明

### `src/skill/*`

这里负责：

- 让 agent 理解这个技能什么时候该用
- 理解工具是干什么的
- 理解前置条件、默认值和边界

这里不应该塞：

- 纯实现细节
- 源码级解释
- 平台内部设计

## 工具怎么写

一个工具通常至少要有：

- `name`
- `description`
- `plugins`
- `inputSchema`
- `outputSchema`
- `run(input, ctx)`

最重要的两条：

- 工具自己声明 `plugins`
- `ctx` 从 `plugins` 自动推导

所以：

- 想要浏览器能力，就在工具上挂 `browserPlugin`
- 不要把运行时能力重复挂到技能层

## 技能入口怎么写

`defineSkill` 主要负责：

- `name`
- `description`
- `overview`
- `config`
- `tools`

它更像组织层和说明层，不是主要执行层。

## 怎么验证

最小验证顺序：

1. 运行项目测试
2. 在技能目录里执行目标工具
3. 重新 `build`
4. 检查生成出来的 `skill/SKILL.md`

如果是浏览器工具，还要额外确认：

- 登录态是否可复用
- 默认配置是否依赖本机环境
- 返回值是否足够给下游继续用

## 不要做的事

- 不要把所有逻辑都堆进 `src/index.ts`
- 不要只改代码不补 `src/skill/SKILL.md`
- 不要改完工具后忘记 `cli-skill build`
- 不要把平台说明写进技能项目自己的文档里

## 什么时候回到主文档

如果你现在卡住的是：

- 什么时候该录制
- 什么时候该 build / mount / publish
- 怎么判断这是不是一个技能任务

回到：

- [主技能说明](../SKILL.md)
