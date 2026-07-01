---
title: IoT 与实时事件 API
description: IoT 数据上报、Token 签发、SSE 订阅端点
---

# IoT 与实时事件 API

IoT 模块代理上游 IoT 网关的请求/响应，EcoCtrl 透明处理 Token 刷新（依赖 `iot_tokens` 表）。实时事件模块提供基于 SSE（Server-Sent Events）的推送订阅。

所有端点均需认证。

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）

## IoT Token

### GET /api/iot/token

返回当前缓存的 IoT 网关 Access Token。EcoCtrl 在后台自动维护 Token 的刷新与缓存。

| 响应字段    | 类型   | 说明                    |
| ----------- | ------ | ----------------------- |
| `token`     | string | 缓存的 IoT Access Token |
| `expiresAt` | string | 过期时间                |

### POST /api/iot/token

主动签发或刷新 IoT 网关 Token。

| 字段                        | 类型    | 说明             |
| --------------------------- | ------- | ---------------- |
| `forceRefresh` (body, 可选) | boolean | 是否强制刷新缓存 |
| **响应** `token`            | string  | 新 Token         |

## 点位数据

请求/响应保持上游 IoT 网关契约，EcoCtrl 透明转发。

### POST /api/iot/codes/values

读取当前点位值。

| 字段           | 类型  | 说明                             |
| -------------- | ----- | -------------------------------- |
| `codes` (body) | array | 点位编码列表                     |
| **响应**       | array | 每个点位的当前值、时间戳、质量戳 |

### POST /api/iot/codes/history

查询点位历史值。

| 字段                    | 类型              | 说明         |
| ----------------------- | ----------------- | ------------ |
| `codes` (body)          | array             | 点位编码列表 |
| `from` (body)           | string (ISO 8601) | 起始时间     |
| `to` (body)             | string (ISO 8601) | 结束时间     |
| `interval` (body, 可选) | string            | 聚合间隔     |
| **响应**                | array             | 时序数据     |

### POST /api/iot/codes/set

向点位写入控制值。

| 字段               | 类型    | 说明       |
| ------------------ | ------- | ---------- |
| `code` (body)      | string  | 点位编码   |
| `value` (body)     | any     | 要写入的值 |
| **响应** `success` | boolean | 写入结果   |

### POST /api/iot/codes/force-set

强制写入点位值（绕过安全检查或权限校验）。

| 字段                  | 类型    | 说明         |
| --------------------- | ------- | ------------ |
| `code` (body)         | string  | 点位编码     |
| `value` (body)        | any     | 要写入的值   |
| `reason` (body, 可选) | string  | 强制写入原因 |
| **响应** `success`    | boolean | 写入结果     |

## 报警

### POST /api/iot/alarms

查询 IoT 报警历史。

| 字段                 | 类型              | 说明         |
| -------------------- | ----------------- | ------------ |
| `from` (body)        | string (ISO 8601) | 起始时间     |
| `to` (body)          | string (ISO 8601) | 结束时间     |
| `level` (body, 可选) | string            | 报警级别筛选 |
| `page` (body)        | number            | 页码         |
| `limit` (body)       | number            | 每页数量     |

### POST /api/iot/alarm-configs

查询或配置报警规则。

| 字段                  | 类型   | 说明                                     |
| --------------------- | ------ | ---------------------------------------- |
| `action` (body)       | string | `query` / `create` / `update` / `delete` |
| `config` (body, 可选) | object | 报警规则配置                             |

## 实时事件 (SSE)

### POST /api/events/token

获取 SSE 订阅所需的认证 Token。

| 响应字段    | 类型   | 说明           |
| ----------- | ------ | -------------- |
| `token`     | string | SSE 订阅 Token |
| `expiresAt` | string | 过期时间       |

### GET /api/events

建立 SSE（Server-Sent Events）长连接，用于实时推送事件。

| 查询参数 | 类型         | 说明                                    |
| -------- | ------------ | --------------------------------------- |
| `token`  | query        | 从 `/api/events/token` 获取的订阅 Token |
| `types`  | query (可选) | 逗号分隔的事件类型筛选                  |

**事件类型包括**:

| 事件                        | 说明               |
| --------------------------- | ------------------ |
| `iot:value:change`          | 点位值实时变化     |
| `iot:alarm:trigger`         | 报警触发           |
| `iot:alarm:clear`           | 报警恢复           |
| `workflow:execution:status` | 工作流执行状态变更 |

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）
