---
title: 工作流与执行 API
description: 工作流 CRUD、启停控制、执行记录查询、插件节点枚举
---

# 工作流与执行 API

工作流模块提供自动化流程的定义、触发、执行监控及插件节点扩展能力。所有端点均需认证。

![API 参考](/screenshots/admin-overview.png)

## 工作流 CRUD

### GET /api/workflows

列出所有工作流定义。

| 查询参数  | 类型           | 说明           |
| --------- | -------------- | -------------- |
| `page`    | number         | 页码           |
| `limit`   | number         | 每页数量       |
| `enabled` | boolean (可选) | 按启停状态筛选 |
| **响应**  | array          | 工作流列表     |

### POST /api/workflows

创建工作流定义。

| 字段                       | 类型   | 说明           |
| -------------------------- | ------ | -------------- |
| `name` (body)              | string | 工作流名称     |
| `description` (body, 可选) | string | 描述           |
| `nodes` (body)             | array  | 节点定义列表   |
| `edges` (body)             | array  | 节点间连线定义 |

### GET /api/workflows/:id

获取单个工作流定义的完整信息，包含节点与连线的结构化数据。

### PUT /api/workflows/:id

更新工作流定义（名称、描述、节点编排等）。

### DELETE /api/workflows/:id

删除工作流定义及关联的所有执行记录。

## 工作流控制

### POST /api/workflows/:id/trigger

手动触发工作流执行。适用于测试或按需执行。

| 字段                   | 类型   | 说明                       |
| ---------------------- | ------ | -------------------------- |
| `input` (body, 可选)   | object | 传入工作流的初始上下文数据 |
| **响应** `executionId` | string | 本次执行的唯一 ID          |

### PUT /api/workflows/:id/toggle

启用/停用工作流。停用后不响应任何触发（包括 Webhook 和定时触发）。

| 字段             | 类型    | 说明                      |
| ---------------- | ------- | ------------------------- |
| `enabled` (body) | boolean | `true` 启用，`false` 停用 |

## 执行记录

### GET /api/workflows/:id/executions

列出指定工作流的执行历史。

| 查询参数 | 类型          | 说明                                         |
| -------- | ------------- | -------------------------------------------- |
| `page`   | number        | 页码                                         |
| `limit`  | number        | 每页数量                                     |
| `status` | string (可选) | 按状态筛选：`running` / `success` / `failed` |

| 响应字段     | 类型   | 说明                                        |
| ------------ | ------ | ------------------------------------------- |
| `id`         | string | 执行 ID                                     |
| `status`     | string | 执行状态                                    |
| `startedAt`  | string | 开始时间                                    |
| `finishedAt` | string | 结束时间                                    |
| `trigger`    | string | 触发方式：`manual` / `webhook` / `schedule` |

### GET /api/workflows/:id/executions/:executionId

获取单次执行的详细记录，包含每个节点的输入/输出、耗时及日志。

| 响应字段                 | 类型   | 说明           |
| ------------------------ | ------ | -------------- |
| `nodeResults`            | array  | 各节点执行结果 |
| `nodeResults[].nodeId`   | string | 节点 ID        |
| `nodeResults[].status`   | string | 节点状态       |
| `nodeResults[].input`    | object | 节点输入       |
| `nodeResults[].output`   | object | 节点输出       |
| `nodeResults[].duration` | number | 执行耗时 (ms)  |
| `nodeResults[].logs`     | array  | 节点日志       |

### POST /api/workflows/executions/batch-delete

批量删除执行记录。

| 字段                    | 类型   | 说明                     |
| ----------------------- | ------ | ------------------------ |
| `ids` (body)            | array  | 要删除的执行记录 ID 列表 |
| **响应** `deletedCount` | number | 实际删除数量             |

## 插件节点

### GET /api/nodes

枚举所有可用的工作流插件节点类型。前端据此渲染节点选择面板。

| 响应字段           | 类型   | 说明                                          |
| ------------------ | ------ | --------------------------------------------- |
| `nodes`            | array  | 节点类型列表                                  |
| `nodes[].type`     | string | 节点类型标识                                  |
| `nodes[].name`     | string | 展示名称                                      |
| `nodes[].category` | string | 分类（如 `trigger` / `action` / `condition`） |
| `nodes[].inputs`   | array  | 输入接口定义                                  |
| `nodes[].outputs`  | array  | 输出接口定义                                  |

![API 参考](/screenshots/admin-overview.png)
