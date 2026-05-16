---
"@ecoctrl/admin": patch
"@ecoctrl/web": patch
"@ecoctrl/server": patch
---

- Add `StorageAdapter` abstraction supporting S3 API (MinIO, R2, OSS, AWS S3)
- Integrate MinIO as self-hosted object storage backend
- Refactor `/api/files` and `/api/models` routes to use presigned URL redirects
- Replace `unzipper` with `jszip` for in-memory 3D model ZIP extraction
- Remove `uploads/` local directory dependency
- Add MinIO service to Docker Compose with auto bucket initialization
