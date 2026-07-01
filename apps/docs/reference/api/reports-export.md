---
title: 报表与导出 API
description: 报表模板管理、定时计划 CRUD、CSV 导出
---

# 报表与导出 API

报表模块管理定时报表计划与模板配置，并提供基于队列的异步数据导出能力。所有端点均需认证。

> **注意**：不提供直接的 `/instances` 端点；已生成的报表通过队列 Worker 输出获取。

![API 参考](/screenshots/admin-overview.png)

## 报表计划

### GET /api/reports

列出所有定时报表计划。

| 查询参数  | 类型           | 说明           |
| --------- | -------------- | -------------- |
| `page`    | number         | 页码           |
| `limit`   | number         | 每页数量       |
| `enabled` | boolean (可选) | 按启停状态筛选 |
| **响应**  | array          | 报表计划列表   |

### POST /api/reports

创建定时报表计划。

| 字段                      | 类型    | 说明                              |
| ------------------------- | ------- | --------------------------------- |
| `name` (body)             | string  | 计划名称                          |
| `templateId` (body)       | number  | 关联的报表模板 ID                 |
| `cron` (body)             | string  | Cron 表达式                       |
| `enabled` (body)          | boolean | 是否立即启用                      |
| `recipients` (body, 可选) | array   | 邮件通知接收人列表                |
| `format` (body)           | string  | 输出格式：`pdf` / `csv` / `excel` |

### PUT /api/reports/:id

更新报表计划（名称、Cron 表达式、模板等）。

### DELETE /api/reports/:id

删除报表计划。

## 报表模板

### GET /api/reports/templates

列出所有可用的报表模板。模板定义了报表的布局、指标和数据源。

| 响应字段                  | 类型   | 说明     |
| ------------------------- | ------ | -------- |
| `templates`               | array  | 模板列表 |
| `templates[].id`          | number | 模板 ID  |
| `templates[].name`        | string | 模板名称 |
| `templates[].description` | string | 模板说明 |
| `templates[].category`    | string | 模板分类 |

### POST /api/reports/templates

创建报表模板。

| 字段                       | 类型   | 说明               |
| -------------------------- | ------ | ------------------ |
| `name` (body)              | string | 模板名称           |
| `description` (body, 可选) | string | 描述               |
| `config` (body)            | object | 模板布局与指标配置 |

## 数据导出

### POST /api/reports/export

触发异步 CSV 导出任务。导出结果通过队列 Worker 处理，完成后可在文件列表中获取。

| 字段                   | 类型              | 说明                                         |
| ---------------------- | ----------------- | -------------------------------------------- |
| `type` (body)          | string            | 导出数据类型：`energy` / `faults` / `alarms` |
| `from` (body)          | string (ISO 8601) | 数据起始时间                                 |
| `to` (body)            | string (ISO 8601) | 数据结束时间                                 |
| `filters` (body, 可选) | object            | 额外筛选条件                                 |
| **响应** `jobId`       | string            | 队列任务 ID，可用于追踪导出进度              |

![API 参考](/screenshots/admin-overview.png)
