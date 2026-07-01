---
title: 能源与碳排放 API
description: 能耗数据查询、碳排放因子树、目标值与告警
---

# 能源与碳排放 API

能源与碳排放模块提供区域能耗概览、详细数据查询、统计计算以及碳排放因子管理。所有端点均需认证。

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）

## 区域能耗总览

### GET /api/energy/areas

返回各区域当前能耗快照，以卡片形式呈现。

| 响应字段               | 类型   | 说明                                         |
| ---------------------- | ------ | -------------------------------------------- |
| `areas`                | array  | 区域列表                                     |
| `areas[].name`         | string | 区域名称                                     |
| `areas[].currentPower` | number | 当前功率 (kW)                                |
| `areas[].energyToday`  | number | 今日累计能耗 (kWh)                           |
| `areas[].energyMonth`  | number | 本月累计能耗 (kWh)                           |
| `areas[].status`       | string | 能耗状态：`normal` / `warning` / `overLimit` |

## 详细能耗数据

### GET /api/energy/details

按时间范围查询精细粒度能耗数据。

| 查询参数   | 类型              | 说明                                        |
| ---------- | ----------------- | ------------------------------------------- |
| `areaId`   | number (可选)     | 区域 ID，不传则返回全部区域                 |
| `from`     | string (ISO 8601) | 起始时间                                    |
| `to`       | string (ISO 8601) | 结束时间                                    |
| `interval` | string            | 聚合粒度：`hour` / `day` / `week` / `month` |
| **响应**   | array             | 时序数据点列表                              |

每个数据点包含 `timestamp`、`value`、`unit`、`areaId`。

## 能耗统计

### GET /api/energy/stats

返回选定时间范围的能耗统计分析。

| 查询参数      | 类型          | 说明                                                    |
| ------------- | ------------- | ------------------------------------------------------- |
| `areaId`      | number (可选) | 区域筛选                                                |
| `period`      | string        | 统计周期：`today` / `thisWeek` / `thisMonth` / `custom` |
| `from` / `to` | string        | `custom` 周期时必填                                     |

| 响应字段               | 类型   | 说明           |
| ---------------------- | ------ | -------------- |
| `total`                | number | 总能耗 (kWh)   |
| `avg`                  | number | 平均能耗       |
| `peak`                 | number | 峰值能耗       |
| `peakTime`             | string | 峰值发生时间   |
| `comparedToLastPeriod` | object | 环比变化百分比 |

## 碳排放因子

### GET /api/energy/carbon-factors

返回碳排放因子树形结构。植被按类别层级组织（如电力、天然气、水等）。

| 响应字段  | 类型  | 说明                                                         |
| --------- | ----- | ------------------------------------------------------------ |
| `factors` | array | 因子树，每个节点含 `id`、`name`、`value`、`unit`、`children` |

### POST /api/energy/carbon-factors/refresh

触发碳排放因子数据同步/刷新。从上游数据源重新拉取最新的碳排放因子。

| 响应      |              |
| --------- | ------------ |
| `success` | boolean      |
| `message` | 刷新结果说明 |

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）
