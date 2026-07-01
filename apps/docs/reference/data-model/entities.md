---
title: 核心实体参考
description: 28 个 Drizzle schema 表结构及关键字段说明
---

# 核心实体参考

EcoCtrl 在 `packages/server/src/schemas/` 下定义 28 个 Drizzle ORM 表。下面对核心表的用途和关键字段进行说明。

## 用户与权限

### `users`

| 字段      | 类型               | 说明                                |
| --------- | ------------------ | ----------------------------------- |
| id        | uuid PK            | 用户唯一标识                        |
| username  | varchar(50) unique | 登录用户名                          |
| email     | varchar(255)       | 邮箱地址                            |
| password  | varchar(255)       | bcrypt 哈希密码                     |
| role      | varchar(20)        | admin / manager / operator / viewer |
| avatarUrl | text               | 头像 URL                            |

### `refresh_tokens`

| 字段      | 类型               | 说明                          |
| --------- | ------------------ | ----------------------------- |
| id        | serial PK          |                               |
| userId    | uuid FK → users.id | 关联用户                      |
| tokenHash | varchar(64) unique | Refresh Token 的 SHA-256 哈希 |
| expiresAt | timestamp          | 过期时间（7天）               |

### `oauth_accounts`

| 字段           | 类型               | 说明              |
| -------------- | ------------------ | ----------------- |
| id             | serial PK          |                   |
| userId         | uuid FK → users.id | 关联用户          |
| provider       | varchar(20)        | wechat / feishu   |
| providerUserId | varchar(255)       | 第三方平台用户 ID |

## 模型与对象

### `models`

| 字段     | 类型         | 说明            |
| -------- | ------------ | --------------- |
| id       | uuid PK      | 模型唯一标识    |
| name     | varchar(100) | 模型名称        |
| version  | varchar(20)  | 版本号          |
| code     | varchar(50)  | 模型编码        |
| filePath | text         | 3D 模型文件路径 |

### `objects`

| 字段    | 类型                | 说明     |
| ------- | ------------------- | -------- |
| id      | uuid PK             |          |
| modelId | uuid FK → models.id | 关联模型 |
| code    | varchar(50)         | 对象编码 |
| name    | varchar(100)        | 对象名称 |

### `points`

| 字段     | 类型                 | 说明                      |
| -------- | -------------------- | ------------------------- |
| id       | uuid PK              |                           |
| objectId | uuid FK → objects.id | 关联对象                  |
| type     | varchar(20)          | sensor / actuator / meter |
| code     | varchar(50)          | 点位编码                  |
| name     | varchar(100)         | 点位名称                  |
| zone     | varchar(50)          | 分区                      |
| system   | varchar(50)          | 所属系统                  |

## 工作流

### `workflows`

| 字段        | 类型         | 说明                                |
| ----------- | ------------ | ----------------------------------- |
| id          | uuid PK      |                                     |
| name        | varchar(200) | 工作流名称                          |
| dsl         | jsonb        | 工作流 DSL 定义                     |
| triggerType | varchar(20)  | manual / schedule / webhook / event |
| enabled     | boolean      | 启用状态                            |
| version     | int          | 版本号                              |

### `workflow_executions`

| 字段       | 类型                   | 说明                         |
| ---------- | ---------------------- | ---------------------------- |
| id         | uuid PK                |                              |
| workflowId | uuid FK → workflows.id |                              |
| status     | varchar(20)            | running / completed / failed |
| output     | jsonb                  | 执行输出                     |
| startedAt  | timestamp              | 开始时间                     |
| duration   | int                    | 耗时（ms）                   |

## 能耗与碳排放

### `energy_readings`

| 字段        | 类型                     | 说明          |
| ----------- | ------------------------ | ------------- |
| id          | serial PK                |               |
| areaId      | int FK → energy_areas.id | 区域          |
| value       | numeric                  | 能耗值（kWh） |
| powerFactor | numeric                  | 功率因素      |
| loadRate    | numeric                  | 负载率        |
| recordedAt  | timestamp                | 记录时间      |

### `energy_areas`

| 字段            | 类型         | 说明         |
| --------------- | ------------ | ------------ |
| id              | serial PK    |              |
| name            | varchar(100) | 区域名称     |
| targetValue     | numeric      | 目标能耗值   |
| basePowerFactor | numeric      | 基准功率因素 |

### `carbon_factors`

| 字段   | 类型                            | 说明                 |
| ------ | ------------------------------- | -------------------- |
| id     | serial PK                       |                      |
| nodeId | int FK → carbon_factor_nodes.id | 分类节点             |
| name   | varchar(200)                    | 因子名称             |
| value  | numeric                         | 因子值               |
| unit   | varchar(50)                     | 单位（如 kgCO₂/kWh） |

## 故障与维护

### `faults`

| 字段        | 类型         | 说明                            |
| ----------- | ------------ | ------------------------------- |
| id          | serial PK    |                                 |
| deviceName  | varchar(100) | 设备名称                        |
| level       | varchar(10)  | critical / warning / info       |
| status      | varchar(20)  | pending / processing / resolved |
| triggeredAt | timestamp    | 触发时间                        |

### `fault_stats`

| 字段        | 类型        | 说明               |
| ----------- | ----------- | ------------------ |
| id          | serial PK   |                    |
| totalFaults | int         | 故障总数           |
| mttr        | int         | 平均修复时间（秒） |
| period      | varchar(10) | 统计周期           |

### `maintenance`

| 字段        | 类型         | 说明                |
| ----------- | ------------ | ------------------- |
| id          | serial PK    |                     |
| title       | varchar(200) | 维护标题            |
| scheduledAt | date         | 计划日期            |
| status      | varchar(20)  | pending / completed |

## 报表

### `report_plans`

| 字段       | 类型         | 说明                     |
| ---------- | ------------ | ------------------------ |
| id         | serial PK    |                          |
| name       | varchar(200) | 计划名称                 |
| recipients | text         | 收件人邮箱（CSV）        |
| frequency  | varchar(20)  | daily / weekly / monthly |
| enabled    | boolean      | 启用状态                 |

## IoT

### `iot_tokens`

| 字段         | 类型      | 说明                    |
| ------------ | --------- | ----------------------- |
| id           | serial PK |                         |
| accessToken  | text      | IoT 网关访问令牌        |
| refreshToken | text      | IoT 网关刷新令牌        |
| expiresAt    | bigint    | 绝对过期时间（Unix ms） |

## 系统配置

### `platform_configs`

键值对存储平台配置（SMTP、备份设置等）

### `dashboard_widgets`

| 字段          | 类型        | 说明                |
| ------------- | ----------- | ------------------- |
| id            | serial PK   |                     |
| type          | varchar(20) | widget 类型         |
| dataType      | varchar(20) | 数据源类型          |
| dataJson      | jsonb       | 配置数据            |
| layoutX/Y/W/H | int         | Bento Grid 布局坐标 |

### `dashboard_models`

| 字段    | 类型                | 说明                         |
| ------- | ------------------- | ---------------------------- |
| id      | serial PK           |                              |
| modelId | uuid FK → models.id | 关联模型                     |
| config  | jsonb               | 场景配置（相机、灯光、热点） |

<!-- 28 表定义详见各 schema 文件 -->
