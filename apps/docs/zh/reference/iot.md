# IoT 集成

EcoCtrl 充当上游 IoT 网关的透明代理。前端从不直接与网关通信；所有请求都通过 EcoCtrl API 流转，由 API 处理认证、令牌刷新和请求/响应转换。

## 架构

```
浏览器（apps/web 或 apps/admin）
        │
        ▼
   EcoCtrl API  /api/iot/*
        │
        ▼
   令牌刷新服务
        │
        ▼
   上游 IoT 网关
```

## 令牌管理

IoT 网关颁发短生命周期的访问令牌。EcoCtrl 将其缓存在单行 `iot_tokens` 表中：

| 列             | 类型      | 说明                            |
| -------------- | --------- | ------------------------------- |
| `id`           | serial PK |                                 |
| `accessToken`  | text      | 来自网关的当前 Bearer Token。   |
| `refreshToken` | text      | 长生命周期的刷新令牌。          |
| `expiresAt`    | bigint    | 绝对过期时间，Unix 毫秒时间戳。 |

每次出站请求前，服务层会检查 `expiresAt`。如果令牌在 5 分钟内过期（或已过期），它会调用网关的刷新端点，持久化新令牌对，然后继续原始请求。这个过程对调用者是透明的——调用者永远不会看到网关返回 401。

## 对象元数据

物理设备和数据点在 EcoCtrl 中表示为 `objects`：

| 列            | 类型    | 说明                             |
| ------------- | ------- | -------------------------------- |
| `id`          | uuid PK |                                  |
| `code`        | varchar | 来自上游网关的唯一标识符。       |
| `name`        | varchar | 人类可读的标签。                 |
| `type`        | varchar | 类别（传感器、执行器、仪表等）。 |
| `description` | text    | 可选。                           |
| `metadata`    | jsonb   | 上游属性（单位、量程、协议）。   |

对象可以在 admin 后台手动创建，或从网关批量同步。

## API 路由

`/api/iot/*` 下的所有路由都需要有效的 JWT（非公开）。

| 方法 | 路径                   | 说明                               |
| ---- | ---------------------- | ---------------------------------- |
| GET  | `/iot/token`           | 返回缓存的访问令牌（调试用）。     |
| POST | `/iot/codes/values`    | 读取一个或多个对象码的当前点位值。 |
| POST | `/iot/codes/history`   | 查询某点位在时间段内的历史值。     |
| POST | `/iot/codes/set`       | 向可写点位写入值。                 |
| POST | `/iot/codes/force-set` | 强制写入，绕过校验。               |
| POST | `/iot/alarms`          | 网关的告警历史。                   |
| POST | `/iot/alarm-configs`   | 告警阈值配置。                     |

请求和响应形状与上游网关的契约一致。EcoCtrl 原样转发请求体，并返回网关的响应（去除任何凭证头）。

## 环境变量

| 变量       | 必填 | 说明                          |
| ---------- | ---- | ----------------------------- |
| `BASE_URL` | 是   | 上游 IoT 网关基础 URL。       |
| `APP_ID`   | 是   | 令牌刷新时使用的网关应用 ID。 |

两者均从 `packages/server/.env.local` 读取，并转发给 IoT 服务层。

## Web 门户集成

`apps/web` 在仪表盘上显示实时 IoT 数据。组件系统（`dashboard-widgets`）可以通过 `dataType` 字段绑定到 IoT 点位值。当组件的 `dataType` 设置为 `iot` 时，前端会定期轮询 `/api/iot/codes/values` 并渲染最新读数。
