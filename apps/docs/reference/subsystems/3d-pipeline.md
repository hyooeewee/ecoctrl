---
title: 3D 模型管线
description: 模型上传（100MB、glb/gltf/obj）、磁盘存储、场景编辑器（模型/标签/动作三种模式）、热点交互系统
---

# 3D 模型管线

EcoCtrl 通过 Babylon.js 支持交互式 3D 建筑可视化。管理员通过 Admin 后台上传 glTF/glB 模型，Web 门户以可配置的相机角度、环境光和标注热点渲染。管线涉及三条数据流：模型上传、场景配置、实时交互。

## 模型上传

### 上传路由

`routes/models.ts` 处理模型上传：

- **单文件限制**：100 MB
- **支持格式**：`.glb`（二进制 glTF，首选）、`.gltf` + `.bin` + 纹理、`.obj`
- **存储位置**：`uploads/models/` 目录
- **对外公开**：通过 `fastify-static` 插件暴露于 `/static/models/<filename>`
- **MIME 类型**：`model/gltf+json`、`model/gltf-binary`

### 上传流程

```
1. 客户端 multipart 上传
2. 服务器流式写入临时文件
3. 校验（文件大小 ≤ 100MB、MIME、扩展名）
4. 移动到 uploads/models/ 最终位置
5. 插入 models 表记录（原始文件名、文件大小、MIME 类型、URL）
6. 清理临时文件（try/catch/finally）
```

### Admin UI

- **ModelFileZone.tsx** — 拖拽上传区域，含格式校验
- **ModelViewer.tsx** — 基于 Google Model Viewer 的发布前预览

## 数据模型

### models 表

已上传 3D 模型的元数据：

| 列            | 类型        | 说明                                  |
| ------------- | ----------- | ------------------------------------- |
| `id`          | uuid PK     | 主键                                  |
| `name`        | varchar     | 原始文件名                            |
| `fileUrl`     | varchar     | 公共 URL：`/static/models/<filename>` |
| `fileSize`    | bigint      | 文件大小（字节）                      |
| `mimeType`    | varchar     | MIME 类型                             |
| `description` | text        | 可选描述                              |
| `createdAt`   | timestamptz | 创建时间                              |

### dashboard_models 表

单行场景配置：

| 列                      | 类型        | 说明                                        |
| ----------------------- | ----------- | ------------------------------------------- |
| `id`                    | serial PK   | 自增主键                                    |
| `modelFileUrl`          | varchar     | 当前模型文件 URL                            |
| `cameraPreset`          | varchar     | 命名相机角度                                |
| `ambientLightIntensity` | real        | 环境光强度（0–1，默认 0.85）                |
| `hotspots`              | jsonb       | 热点标记数组 `{x, y, z, label, targetId}`   |
| `labels`                | jsonb       | 标签数组 `{position: {x,y,z}, text, color}` |
| `modelFiles`            | jsonb       | 多模型文件列表（含角色绑定、优先级、排序）  |
| `updatedAt`             | timestamptz | 更新时间                                    |

## 场景编辑器

Admin 后台的 3D 场景编辑器（`DashboardModel.tsx`）支持 **3 种编辑模式**：

### model 模式

管理模型文件：上传、排序、设置优先级（`critical` / `background`）、切换可见性。支持多模型文件分层加载。

### label 模式

在 3D 场景中放置和编辑标签。编辑器通过 `modelEditorStore`（`apps/admin/src/store/modelEditorStore.ts`）管理状态：

```typescript
type EditorMode = "select" | "placeLabel" | "clipPreview";
```

- 在 3D 场景中点击选取位置
- 标签包含锚点坐标、树结构、动作绑定
- 标签可嵌套（父子关系）
- 自动保存

### action 模式

配置标签的交互动作。每个标签可绑定多个动作，包括：

- 显示弹窗信息
- 导航到特定系统页面
- 显示关联 IoT 数据
- 触发照明控制

## 热点交互系统

热点是放置在 3D 坐标处的可交互标记：

- 点击显示 `label` 文本提示
- 导航到特定楼层或系统页面
- 显示关联 `targetId` 的实时 IoT 数据

标签是固定在 3D 位置的持久文本注释，适用于标记建筑分区、设备间或能耗区域。

## Web 门户渲染

`apps/web/app/components/dashboard/building-view.tsx` 加载模型：

```
1. GET /api/public/model 获取场景配置
2. 创建 Babylon.js Engine + Scene
3. SceneLoader.ImportMeshAsync 加载模型
4. 应用相机预设和环境光强度
5. 渲染热点和标签
```

### 相机预设

| 预设              | 说明     |
| ----------------- | -------- |
| `Default_View_01` | 正面概览 |
| `Top_View`        | 鸟瞰图   |
| `Side_View`       | 左侧立面 |

## API

| 方法   | 路径                   | 说明                     |
| ------ | ---------------------- | ------------------------ |
| GET    | `/api/public/model`    | 公开场景配置（无需认证） |
| GET    | `/api/models`          | 列出已上传模型（需认证） |
| POST   | `/api/models`          | 上传新模型               |
| GET    | `/api/models/:id`      | 模型元数据               |
| GET    | `/api/models/:id/file` | 流式获取模型文件         |
| DELETE | `/api/models/:id`      | 删除模型和文件           |
| GET    | `/api/dashboard-model` | 获取全部场景配置         |
| PUT    | `/api/dashboard-model` | 更新场景配置             |
