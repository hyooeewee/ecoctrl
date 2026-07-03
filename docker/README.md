# Docker Compose 场景说明

本项目提供三种 Docker Compose 场景，适用于不同使用需求。

> [!NOTE]
> 出于安全考虑，生成的文件中 postgres、minio、server 的端口以 `x-ports` 标记（仅作为文档参考）。
> Docker Compose 自动忽略 `x-` 前缀的键，这些服务仅通过内部 Docker 网络通信，不会暴露到宿主机。
> 需要临时调试时，将 `x-ports` 改为 `ports` 即可。
> 开发环境（`compose.dev.yaml`）不受此限制，所有端口正常暴露。

---

## 场景一：预构建部署（默认）

从 GitHub Container Registry 拉取预构建镜像，适合普通用户开箱即用。

```bash
cd docker
cp .env.example .env.local
# 编辑 .env.local 填入必要配置（JWT_SECRET、数据库密码等）
docker compose up -d
```

### 升级

升级前请备份数据目录（包含数据库和上传文件）：

```bash
cd docker
tar czf ecoctrl.$(date +%Y%m%d%H%M%S).bak ecoctrl/
docker compose pull
docker compose up -d
```

访问：

- Web: http://localhost:8081
- Admin: http://localhost:4173

> 内部服务（API、MinIO、PostgreSQL）仅通过 Docker 内部网络通信，如需调试请将 `x-ports` 改为 `ports`。

---

## 场景二：源码构建部署

从本地 Dockerfile 构建完整服务，适合需要自定义代码或二次开发的用户。

> 注意：并发构建多个 Node 镜像可能因内存/网络资源不足导致失败。推荐使用串行构建脚本：

```bash
cd docker
cp .env.example .env.local
# 编辑 .env.local 填入必要配置（JWT_SECRET、数据库密码等）

# 串行构建并启动（推荐）
./build.sh

# 或手动逐个构建
# docker compose -f compose.build.yaml build postgres
# docker compose -f compose.build.yaml build server
# docker compose -f compose.build.yaml build web
# docker compose -f compose.build.yaml build admin
# docker compose -f compose.build.yaml up -d
```

访问：

- Web: http://localhost:8081
- Admin: http://localhost:4173

> 内部服务（API、MinIO、PostgreSQL）仅通过 Docker 内部网络通信，如需调试请将 `x-ports` 改为 `ports`。

---

## 场景三：开发调试

挂载本地源码，启用热重载，适合开发者日常开发。

```bash
cd docker
cp .env.example .env.local
# 编辑 .env.local 填入必要配置（JWT_SECRET、数据库密码等）
docker compose -f compose.build.yaml -f compose.dev.yaml up
```

访问：

- Web: http://localhost:8080
- Admin: http://localhost:5173
- API: http://localhost:3001
- DB: http://localhost:5432

---

## 环境变量

预构建部署和源码构建部署共用 `docker/.env.local` 配置文件。首次使用前复制示例文件并根据需要修改：

```bash
cp .env.example .env.local
```

主要配置项：

| 变量                                   | 说明                                              | 必填                            |
| -------------------------------------- | ------------------------------------------------- | ------------------------------- |
| `JWT_SECRET`                           | JWT 签名密钥                                      | 是                              |
| `INIT_ADMIN_PASSWORD`                  | 初始管理员密码                                    | 否（留空则随机生成）            |
| `DATABASE_URL`                         | 外部数据库连接字符串（留空则使用内部 PostgreSQL） | 否                              |
| `OPENWEATHER_API_KEY`                  | 天气 API 密钥                                     | 否                              |
| `SMTP_USER` / `SMTP_PASS`              | 邮件服务器账号                                    | 否                              |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET`  | 微信 OAuth                                        | 否                              |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET`  | 飞书 OAuth                                        | 否                              |
| `BASE_URL` / `APP_ID`                  | IoT 客户端接入地址和应用 ID                       | 否                              |
| `STORAGE_PROVIDER`                     | 对象存储后端 (`minio` / `local`)                  | 否                              |
| `S3_ENDPOINT`                          | S3 兼容存储地址                                   | 否（使用内部 MinIO 时自动配置） |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY`      | S3 访问密钥                                       | 否                              |
| `S3_BUCKET_FILES` / `S3_BUCKET_MODELS` | 上传文件和 3D 模型存储桶                          | 否                              |
