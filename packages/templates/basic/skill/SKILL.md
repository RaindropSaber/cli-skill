---
name: __SKILL_NAME__
description: 说明如何使用 __CLI_NAME__ 操作 __SKILL_NAME__ skill。
---

# __SKILL_NAME__

## 概述

这个 skill 提供一个示例工具 `sample_tool`，用于验证 cli-skill 生成出来的 skill 是否可正常工作。

这个 skill 的文档结构应尽量保持简洁，概述之外，主要内容通过 `cli-skill sync-skill --write` 自动生成并同步。

## Tool Reference

<!-- BEGIN GENERATED TOOLS -->
| 工具 | 说明 |
| --- | --- |
| sample_tool | 最小示例工具。 |

### `sample_tool`

**例子**

| 场景 | 命令 |
| --- | --- |
| 验证 skill 和 CLI 是否已接通 | `__CLI_NAME__ run sample_tool '{"message":"hello"}'` |

**输入**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| message | string |   |

**输出**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| ok | true |   |
| echoed | string |   |
<!-- END GENERATED TOOLS -->

## Config Reference

<!-- BEGIN GENERATED CONFIG -->
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| - | - | - |
<!-- END GENERATED CONFIG -->
