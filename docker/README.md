# Docker Compose 场景说明

本项目提供三种 Docker Compose 场景，适用于不同使用需求。

---

## 场景一：预构建部署（默认）

从 GitHub Container Registry 拉取预构建镜像，适合普通用户开箱即用。

```bash
cd docker
cp .env.example .env.local
# 编辑 .env.local 填入必要配置（JWT_SECRET、数据库密码等）
docker compose up -d
```

访问：

- Web: http://localhost:8081
- Admin: http://localhost:4173
- API: http://localhost:3000
- API Docs: http://localhost:3000/documentation
- DB: localhost:5432

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
- API: http://localhost:3000
- API Docs: http://localhost:3000/documentation
- DB: localhost:5432

---

## 场景三：开发调试

挂载本地源码，启用热重载，适合开发者日常开发。

```bash
cd docker
cp .env.example .env.local
# 编辑 .env.local 填入必要配置（JWT_SECRET、数据库密码等）
docker compose -f compose.build.yaml -f compose.dev.yaml up --build
```

访问：

- Web: http://localhost:8080
- Admin: http://localhost:5173（Vite 默认开发端口）
- API: http://localhost:3000
- DB: localhost:5432

---

## 环境变量

预构建部署和源码构建部署共用 `docker/.env.local` 配置文件。首次使用前复制示例文件并根据需要修改：

```bash
cp .env.example .env.local
```

主要配置项：

| 变量                                  | 说明                                              | 必填                 |
| ------------------------------------- | ------------------------------------------------- | -------------------- |
| `JWT_SECRET`                          | JWT 签名密钥                                      | 是                   |
| `INITIAL_ADMIN_PASSWORD`              | 初始管理员密码                                    | 否（留空则随机生成） |
| `DATABASE_URL`                        | 外部数据库连接字符串（留空则使用内部 PostgreSQL） | 否                   |
| `OPENWEATHER_API_KEY`                 | 天气 API 密钥                                     | 否                   |
| `SMTP_USER` / `SMTP_PASS`             | 邮件服务器账号                                    | 否                   |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 微信 OAuth                                        | 否                   |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书 OAuth                                        | 否                   |
| `BASE_URL` / `APP_ID`                 | IoT 客户端接入地址和应用 ID                       | 否                   |
