# @cli-skill/templates

`@cli-skill/templates` 负责提供新技能项目的模板。

当 `cli-skill create` 创建一个技能项目时，用到的默认骨架就来自这里。

## 这个包负责什么

- 提供技能项目模板
- 渲染模板中的包名、命令名和版本占位符
- 生成默认的源码结构和文档模板

## 模板默认包含什么

当前基础模板会生成：

- `src/index.ts`
- `src/tools/*`
- `src/skill/SKILL.md`
- `src/skill/agents/openai.yaml`
- `bin/<cli-name>`
- `package.json`

这意味着新项目一开始就同时具备：

- 技能定义入口
- 工具目录
- 技能文档模板
- agent 元数据
- 本地命令入口

## 设计目标

模板的目标不是生成一份最终成品，而是给出一个足够像真实项目的起点：

- 目录结构已经齐全
- 默认文档骨架已经可用
- 后续只需要围绕业务目标补工具和文档

## 与其他包的关系

- `@cli-skill/cli`
  - 负责调用模板创建项目
- `@cli-skill/core`
  - 负责技能和工具的定义与运行

模板本身不承担运行时逻辑，它只负责把项目骨架准备好。
