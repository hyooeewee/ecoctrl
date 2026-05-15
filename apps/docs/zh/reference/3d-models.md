# 3D 模型

EcoCtrl 通过 Babylon.js 支持交互式 3D 建筑可视化。管理员通过 admin 后台上传 glTF/glB 模型；公共 web 门户以可配置的相机角度、光照和标注热点渲染它们。

## 上传管道

### Admin UI

admin 后台的**模型**页面提供：

- **ModelFileZone.tsx** — 带格式校验的拖拽上传区域。
- **ModelViewer.tsx** — 使用 Google Model Viewer 在发布前预览模型。
- 场景配置面板，用于设置相机预设、环境光和热点位置。

### 支持格式

- **glTF 2.0**（`.gltf` + `.bin` + 纹理）
- **glB**（二进制 glTF，`.glb`）— 单文件上传的首选

其他格式（FBX、OBJ、STL）不直接支持。上传前请使用 Blender 或在线转换器转换为 glB。

## 数据模型

### `models`

已上传的 3D 模型元数据。

| 列            | 类型        | 说明                                       |
| ------------- | ----------- | ------------------------------------------ |
| `id`          | uuid PK     |                                            |
| `name`        | varchar     | 原始文件名。                               |
| `fileUrl`     | varchar     | 公共 URL：`/static/models/<filename>`。    |
| `fileSize`    | bigint      | 字节数。                                   |
| `mimeType`    | varchar     | `model/gltf+json` 或 `model/gltf-binary`。 |
| `description` | text        | 可选。                                     |
| `createdAt`   | timestamptz |                                            |

### `dashboard_models`

单行场景配置。

| 列                      | 类型        | 说明                                               |
| ----------------------- | ----------- | -------------------------------------------------- |
| `id`                    | serial PK   |                                                    |
| `modelFileUrl`          | varchar     | 当前模型文件 URL。                                 |
| `cameraPreset`          | varchar     | 命名相机角度（`Default_View_01`、`Top_View` 等）。 |
| `ambientLightIntensity` | real        | 0–1，默认 0.85。                                   |
| `hotspots`              | jsonb       | `{x, y, z, label, targetId}` 数组。                |
| `labels`                | jsonb       | `{position: {x,y,z}, text, color}` 数组。          |
| `updatedAt`             | timestamptz |                                                    |

## Web 门户渲染

`apps/web/app/components/dashboard/building-view.tsx` 将活动模型加载到 Babylon.js 场景中：

```ts
// 简化流程
const config = await fetch("/api/public/model").then((r) => r.json());
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
await SceneLoader.ImportMeshAsync("", config.modelFileUrl, "", scene);
// 从配置应用相机预设、环境光、热点和标签
```

### 相机预设

相机预设是存储在模型 glTF 数据中的命名视图，或在 `dashboard_models.cameraPreset` 中覆盖。常用预设：

| 预设              | 说明         |
| ----------------- | ------------ |
| `Default_View_01` | 正面概览。   |
| `Top_View`        | 鸟瞰图。     |
| `Side_View`       | 左侧立面图。 |

### 热点

热点是放置在 3D 坐标处的可点击标记。点击时可以：

- 显示 `label` 文本的工具提示。
- 导航到特定楼层或系统页面。
- 显示关联 `targetId` 的实时 IoT 数据。

### 标签

标签是固定在 3D 位置的持久文本注释。适用于标记建筑分区、设备间或能耗区域。

## API

| 方法   | 路径                   | 说明                       |
| ------ | ---------------------- | -------------------------- |
| GET    | `/api/public/model`    | 公开场景配置（无需认证）。 |
| GET    | `/api/models`          | 列出已上传模型。           |
| POST   | `/api/models`          | 上传新模型。               |
| GET    | `/api/models/:id`      | 获取模型元数据。           |
| DELETE | `/api/models/:id`      | 删除模型和文件。           |
| GET    | `/api/dashboard-model` | 获取完整场景配置。         |
| PUT    | `/api/dashboard-model` | 更新场景配置。             |

## 文件服务

模型通过 `/static/models/<filename>` 作为静态文件提供。Fastify 的 `fastify-static` 插件处理此路由：

```ts
await fastify.register(fastifyStatic, {
  root: "uploads/models",
  prefix: "/static/models/",
});
```

`/static/models/*` 无需认证——web 门户需要直接在浏览器中加载它们。
