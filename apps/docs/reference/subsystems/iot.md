---
title: 物联网 (IoT) 集成
description: IoT 网关透明代理、Token 自动刷新、对象与点位数据模型、API 路由
---

# 物联网 (IoT) 集成

EcoCtrl 充当上游第三方 IoT 网关的**透明代理**。前端（Admin/Web）从不直接与网关通信，所有请求经由 EcoCtrl API 流转，由 EcoCtrl 统一处理认证、Token 刷新和数据映射。

## 架构

```
浏览器（apps/web 或 apps/admin）
        │
        ▼
   EcoCtrl API  /api/iot/*
   (routes/iot.ts — 透明代理转发)
        │
        ▼
   IoT 服务层 (services/iot/)
   - Token 过期检查 & 自动刷新
        │
        ▼
   上游 IoT 网关（BACnet 协议）
```

## Token 管理

### iotTokens Schema

`schemas/iotTokens.ts` — 单行 Token 缓存表：

| 列             | 类型      | 说明                            |
| -------------- | --------- | ------------------------------- |
| `id`           | serial PK | 自增主键                        |
| `accessToken`  | text      | 网关的 Bearer Token             |
| `refreshToken` | text      | 长生命周期刷新令牌              |
| `expiresAt`    | bigint    | 绝对过期时间（Unix 毫秒时间戳） |

### 自动刷新机制

每次出站请求前，服务层检查 `expiresAt`。如果 Token 在 **5 分钟内过期**（或已过期），自动执行：

```
1. 检测 Token 即将过期
2. 用 refreshToken 调用网关刷新端点
3. 持久化新 Token 对到 iot_tokens 表
4. 继续执行原始请求
```

整个过程对调用者完全透明 — 调用者永远不会看到网关返回 401。

## 对象模型

### objects Schema

物理设备在 EcoCtrl 中表示为 `objects`：

| 列            | 类型    | 说明                           |
| ------------- | ------- | ------------------------------ |
| `id`          | uuid PK | 主键                           |
| `code`        | varchar | 上游网关唯一标识符             |
| `name`        | varchar | 人类可读标签                   |
| `type`        | varchar | 类别：传感器、执行器、仪表等   |
| `description` | text    | 可选描述                       |
| `metadata`    | jsonb   | 上游属性（单位、量程、协议等） |

对象可在 Admin 后台手动创建，或从网关批量同步。

### points Schema

IoT 点位数据模型：

| 列           | 类型        | 说明              |
| ------------ | ----------- | ----------------- |
| `id`         | uuid PK     | 主键              |
| `objectCode` | varchar     | 关联对象的 `code` |
| `code`       | varchar     | 点位标识符        |
| `name`       | varchar     | 点位名称          |
| `value`      | jsonb       | 当前值            |
| `unit`       | varchar     | 单位              |
| `updatedAt`  | timestamptz | 更新时间          |

## API 路由

所有 `/api/iot/*` 路由需要有效 JWT（非公开）：

| 方法 | 路径                       | 说明                              |
| ---- | -------------------------- | --------------------------------- |
| GET  | `/api/iot/token`           | 返回缓存的 Access Token（调试用） |
| POST | `/api/iot/codes/values`    | 读取一个或多个对象码的当前点位值  |
| POST | `/api/iot/codes/history`   | 查询点位在时间段内的历史值        |
| POST | `/api/iot/codes/set`       | 向可写点位写入值                  |
| POST | `/api/iot/codes/force-set` | 强制写入（绕过校验）              |
| POST | `/api/iot/alarms`          | 网关告警历史                      |
| POST | `/api/iot/alarm-configs`   | 告警阈值配置                      |

请求/响应形状与上游网关契约一致。EcoCtrl 原样转发请求体，返回网关响应（已去除凭证头）。

## 环境变量

| 变量       | 必填 | 说明                          |
| ---------- | ---- | ----------------------------- |
| `BASE_URL` | 是   | 上游 IoT 网关基础 URL         |
| `APP_ID`   | 是   | Token 刷新时使用的网关应用 ID |

两者从 `packages/server/.env.local` 读取，转发给 IoT 服务层。

## Web 门户集成

`apps/web` 仪表盘组件可通过 `dataType: "iot"` 绑定到 IoT 点位值。前端定期轮询 `/api/iot/codes/values` 获取最新读数并渲染。

## 相关文件

- `packages/server/src/routes/iot.ts` — IoT 代理路由
- `packages/server/src/schemas/iotTokens.ts` — Token 表定义
- `packages/server/src/schemas/objects.ts` — 设备对象表
- `packages/server/src/schemas/points.ts` — 点位数据表
- `packages/server/src/services/iot/` — IoT 服务层
