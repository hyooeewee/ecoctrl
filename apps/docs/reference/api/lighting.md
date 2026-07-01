---
title: 照明控制 API
description: 照明状态查询、组开关切换、批量控制、Mock 模式
---

# 照明控制 API

照明控制模块提供对建筑/区域照明设备的远程管理：查询状态、开关切换和批量控制。对接底层 IoT 网关协议，支持 Mock 模式用于开发调试。

所有端点均需认证。

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）

## 查询照明状态

### GET /api/control/lighting/:labelId/status

查询指定照明标签组的状态。

| 参数              | 类型   | 说明                       |
| ----------------- | ------ | -------------------------- |
| `:labelId` (path) | string | 照明标签标识（如区域编码） |

| 响应字段     | 类型          | 说明                |
| ------------ | ------------- | ------------------- |
| `labelId`    | string        | 标签 ID             |
| `on`         | boolean       | 当前开关状态        |
| `brightness` | number (可选) | 亮度百分比（0-100） |
| `power`      | number (可选) | 当前功率 (W)        |
| `updatedAt`  | string        | 状态更新时间        |

## 开关切换

### POST /api/control/lighting/:labelId/toggle

切换指定照明标签组的开关状态。

| 参数              | 类型    | 说明                      |
| ----------------- | ------- | ------------------------- |
| `:labelId` (path) | string  | 照明标签标识              |
| `on` (body)       | boolean | `true` 开灯，`false` 关灯 |

| 响应字段  | 类型    | 说明         |
| --------- | ------- | ------------ |
| `success` | boolean | 操作是否成功 |
| `labelId` | string  | 标签 ID      |
| `on`      | boolean | 切换后状态   |

## 批量控制

### POST /api/control/lighting/:labelId/batch

向指定标签组下发批量控制指令。适用于场景联动（如"一键关灯"）。

| 参数                   | 类型   | 说明                                                 |
| ---------------------- | ------ | ---------------------------------------------------- |
| `:labelId` (path)      | string | 照明标签标识                                         |
| `action` (body)        | string | 控制动作：`on` / `off` / `dim` / `scene`             |
| `value` (body, 可选)   | any    | 动作参数（如 `dim` 时的亮度值，`scene` 时的场景 ID） |
| `devices` (body, 可选) | array  | 设备子集，不传则控制组内全部设备                     |

| 响应字段             | 类型    | 说明               |
| -------------------- | ------- | ------------------ |
| `success`            | boolean | 整体操作结果       |
| `results`            | array   | 每个设备的执行结果 |
| `results[].deviceId` | string  | 设备 ID            |
| `results[].success`  | boolean | 单设备执行结果     |

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）
