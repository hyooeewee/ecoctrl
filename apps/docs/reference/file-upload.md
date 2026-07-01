# 文件上传

EcoCtrl 支持两条上传管道：通用文件和 3D 模型。两者都使用 Fastify 的 multipart 插件，单文件限制 100 MB。

## 通用文件（`/api/files/*`）

用于文档、图片、CSV 导出和其他附件。

| 方法   | 路径                 | 说明                                      |
| ------ | -------------------- | ----------------------------------------- |
| GET    | `/files`             | 列出已上传文件及其元数据。                |
| POST   | `/files`             | 上传新文件（multipart/form-data）。       |
| GET    | `/files/:id`         | 获取文件元数据（名称、MIME、大小、URL）。 |
| GET    | `/files/:id/preview` | 流式传输二进制内容。                      |
| DELETE | `/files/:id`         | 删除文件记录并从磁盘移除。                |

文件存储在 `uploads/` 下，以 UUID 作为文件名。`files` 表跟踪原始名称、MIME 类型、大小和磁盘路径。

## 3D 模型（`/api/models/*`）

专门用于 web 门户 Babylon.js 场景消费的 glTF/glB 模型的上传管道。

| 方法   | 路径          | 说明                                |
| ------ | ------------- | ----------------------------------- |
| GET    | `/models`     | 列出已上传的 3D 模型。              |
| POST   | `/models`     | 上传新模型（multipart/form-data）。 |
| GET    | `/models/:id` | 获取模型元数据。                    |
| DELETE | `/models/:id` | 删除模型并从磁盘移除。              |

模型存放在 `uploads/models/`，通过 Fastify 静态插件暴露在 `/static/models/<filename>`。`models` 表存储元数据，包括原始文件名和公共 URL。

## 上传流程

两条管道遵循相同的安全模式：

```
客户端 → multipart 上传
    │
    ▼
服务器流式写入临时文件
    │
    ▼
校验（大小、MIME 类型、扩展名）
    │
    ▼
移动到最终位置（uploads/ 或 uploads/models/）
    │
    ▼
插入元数据行（files 或 models 表）
```

**关键**：始终在 `try/catch/finally` 块中清理临时文件。如果校验在流式写入磁盘后失败，必须在返回错误响应前删除临时文件。

## 删除资源时

使用仓库 `deleteXxx` 函数返回的记录来定位并删除物理文件：

```ts
const deleted = await deleteFile(id);
if (deleted?.fileUrl) {
  await unlink(path.join(uploadsDir, basename(deleted.fileUrl)));
}
```

这可以防止数据库行删除后磁盘上残留孤儿文件。

## 客户端使用

admin 后台使用 `ModelFileZone.tsx` 实现拖拽上传模型。通用文件可使用标准的 `<input type="file">` 配合 `FormData`：

```ts
const formData = new FormData();
formData.append("file", file);
await fetch("/api/files", { method: "POST", body: formData });
```
