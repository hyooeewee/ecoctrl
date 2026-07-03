---
title: 数据模型与对象 API
description: 数据模型 CRUD、业务对象 CRUD、点位 CRUD、批量导入
---

# 数据模型与对象 API

数据模型与对象模块管理物联网场景中的三层抽象：**模型**（3D 模型文件）、**对象**（物理设备/逻辑实体）、**点位**（数据采集点）。所有端点均需认证。

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）

## 模型

模型对应上传的 3D 模型文件（如建筑结构、设备模型）。文件存储位置取决于 `STORAGE_PROVIDER` 配置：
**local** 模式落盘到 `uploads/models/`，**minio** 模式存储于 MinIO `ecoctrl-models` 存储桶。统一通过 API 代理端点 `/api/models/:id/file` 访问。

### GET /api/models

列出所有已上传模型。支持分页参数。

| 查询参数 | 类型   | 说明              |
| -------- | ------ | ----------------- |
| `page`   | number | 页码，默认 1      |
| `limit`  | number | 每页数量，默认 20 |
| `search` | string | 按名称搜索        |
| **响应** | array  | 模型列表          |

### POST /api/models

上传新模型。

| 字段                       | 类型   | 说明        |
| -------------------------- | ------ | ----------- |
| `name` (body)              | string | 模型名称    |
| `description` (body, 可选) | string | 描述        |
| `file` (multipart)         | file   | 3D 模型文件 |
| **响应** `id`              | number | 新模型 ID   |

### GET /api/models/:id/file

流式获取模型文件二进制内容。注意：不存在 `GET /api/models/:id`；获取模型文件应使用此端点。

### PUT /api/models/:id

更新模型元数据。

| 字段                       | 类型   | 说明   |
| -------------------------- | ------ | ------ |
| `name` (body, 可选)        | string | 新名称 |
| `description` (body, 可选) | string | 新描述 |
| `version` (body, 可选)     | string | 版本号 |

### DELETE /api/models/:id

删除模型及其关联文件。

### POST /api/models/:id/import-points

为模型关联的业务对象批量导入点位。

| 字段            | 类型  | 说明         |
| --------------- | ----- | ------------ |
| `points` (body) | array | 点位定义列表 |

## 业务对象

对象代表上游 IoT 网关中的物理设备或逻辑数据单元。

### GET /api/objects

列出所有业务对象。

| 查询参数  | 类型   | 说明       |
| --------- | ------ | ---------- |
| `modelId` | number | 按模型筛选 |
| `page`    | number | 页码       |
| `limit`   | number | 每页数量   |

### POST /api/objects

创建业务对象。

| 字段                       | 类型   | 说明        |
| -------------------------- | ------ | ----------- |
| `name` (body)              | string | 对象名称    |
| `modelId` (body)           | number | 关联模型 ID |
| `code` (body)              | string | 对象编码    |
| `description` (body, 可选) | string | 描述        |

### GET /api/objects/:id

获取业务对象详情，包含关联的点位列表。

### PUT /api/objects/:id

更新业务对象信息。

### DELETE /api/objects/:id

删除业务对象及关联的点位数据。

## 点位

点位是数据采集的最小单元，对应 IoT 网关中的一个数据通道。

### GET /api/points

列出点位。

| 查询参数   | 类型   | 说明           |
| ---------- | ------ | -------------- |
| `objectId` | number | 按业务对象筛选 |
| `page`     | number | 页码           |
| `limit`    | number | 每页数量       |

### POST /api/points

创建点位。

| 字段                    | 类型   | 说明        |
| ----------------------- | ------ | ----------- |
| `name` (body)           | string | 点位名称    |
| `code` (body)           | string | 点位编码    |
| `objectId` (body)       | number | 所属对象 ID |
| `unit` (body, 可选)     | string | 单位        |
| `dataType` (body, 可选) | string | 数据类型    |

### GET /api/points/:id

获取点位详情。

### PUT /api/points/:id

更新点位配置。

### DELETE /api/points/:id

删除点位。

### POST /api/points/import

批量导入点位数据。

| 字段                | 类型   | 说明            |
| ------------------- | ------ | --------------- |
| `points` (body)     | array  | 点位定义数组    |
| `objectId` (body)   | number | 默认关联对象 ID |
| **响应** `imported` | number | 成功导入数量    |
| **响应** `failed`   | number | 失败数量        |

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）
