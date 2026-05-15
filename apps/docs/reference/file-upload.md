# File Upload

EcoCtrl supports two upload pipelines: generic files and 3D models. Both use Fastify's multipart plugin with a 100 MB per-file limit.

## Generic files (`/api/files/*`)

Used for documents, images, CSV exports and other attachments.

| Method | Path                 | Description                                  |
| ------ | -------------------- | -------------------------------------------- |
| GET    | `/files`             | List uploaded files with metadata.           |
| POST   | `/files`             | Upload a new file (multipart/form-data).     |
| GET    | `/files/:id`         | Get file metadata (name, mime, size, URL).   |
| GET    | `/files/:id/preview` | Stream the binary content.                   |
| DELETE | `/files/:id`         | Delete the file record and remove from disk. |

Files are stored on disk under `uploads/` with a UUID filename. The `files` table tracks the original name, MIME type, size and disk path.

## 3D models (`/api/models/*`)

A specialized upload pipeline for glTF/glB models consumed by the web portal's Babylon.js scene.

| Method | Path          | Description                               |
| ------ | ------------- | ----------------------------------------- |
| GET    | `/models`     | List uploaded 3D models.                  |
| POST   | `/models`     | Upload a new model (multipart/form-data). |
| GET    | `/models/:id` | Get model metadata.                       |
| DELETE | `/models/:id` | Delete the model and remove from disk.    |

Models land in `uploads/models/` and are exposed at `/static/models/<filename>` via Fastify's static plugin. The `models` table stores metadata including the original filename and the public URL.

## Upload flow

Both pipelines follow the same safe pattern:

```
Client → multipart upload
    │
    ▼
Server streams to temp file
    │
    ▼
Validate (size, mime type, extension)
    │
    ▼
Move to final destination (uploads/ or uploads/models/)
    │
    ▼
Insert metadata row (files or models table)
```

**Critical**: always clean up temp files in a `try/catch/finally` block. If validation fails after streaming to disk, the temp file must be removed before returning the error response.

## When deleting a resource

Use the record returned by the repository's `deleteXxx` function to locate and remove the physical file:

```ts
const deleted = await deleteFile(id);
if (deleted?.fileUrl) {
  await unlink(path.join(uploadsDir, basename(deleted.fileUrl)));
}
```

This prevents orphaned files on disk when a database row is deleted.

## Client-side usage

The admin dashboard uses `ModelFileZone.tsx` for drag-and-drop model uploads. For generic files, use a standard `<input type="file">` with `FormData`:

```ts
const formData = new FormData();
formData.append("file", file);
await fetch("/api/files", { method: "POST", body: formData });
```
