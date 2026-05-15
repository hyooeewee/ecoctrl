# API 路由

完整、权威的 API 参考是 Fastify 在运行时根据 Zod schema 生成的 OpenAPI 文档 — 打开 `http://localhost:3000/documentation`（Swagger UI）。本页只总结路由地图与每个端点共享的约定。

## 通用约定

- **前缀**：所有路由都在 `/api` 之下。`routes/index.ts` 把 `apiRoutes` 注册时使用了 `prefix: "/api"`。
- **仅 JSON**。响应都是 JSON；唯一例外是 `GET /api/files/:id/preview`，会以二进制流形式返回原始文件。
- **复数名词资源**。典型资源暴露 `GET /api/<resource>`、`POST /api/<resource>`、`GET /api/<resource>/:id`、`PUT /api/<resource>/:id`、`DELETE /api/<resource>/:id`。
- **使用 Zod 校验**。每个 body、querystring、response 都会被校验。非法输入返回 `400`，缺失或过期的认证返回 `401`。
- **错误结构**：`{ "error": "..." }` 用于客户端错误；服务端错误使用 Fastify 默认格式。
- **认证头**：`Authorization: Bearer <accessToken>`。Access Token 默认 15 分钟过期，使用 `/api/auth/refresh` 进行轮换。

## 公共路由（无需 Token）

以下是 `onRequest` 钩子放行的全部路径：

| Method   | 路径                                                        | 用途                                              |
| -------- | ----------------------------------------------------------- | ------------------------------------------------- |
| POST     | `/api/auth/login`                                           | 用户名/邮箱 + 密码登录。                          |
| POST     | `/api/auth/register`                                        | 创建用户。需要先调用 `/auth/register/send-code`。 |
| POST     | `/api/auth/register/send-code`                              | 发送 6 位验证码（5 分钟有效）。                   |
| POST     | `/api/auth/refresh`                                         | 用 Refresh Token 换取新的 Access + Refresh 对。   |
| POST     | `/api/auth/forgot-password/send-code`                       | 发送密码重置验证码。                              |
| POST     | `/api/auth/forgot-password/reset`                           | 通过验证码重置密码。                              |
| GET      | `/api/auth/oauth/providers`                                 | 列出已配置的 OAuth Provider。                     |
| GET/POST | `/api/auth/oauth/wechat/...`、`/api/auth/oauth/feishu/...`  | OAuth 授权与回调。                                |
| POST     | `/api/auth/oauth/bind`、`/api/auth/oauth/register-and-bind` | 把 OAuth 身份绑定到账号。                         |
| GET      | `/api/public/dashboard`                                     | 公开只读看板数据（供 `apps/web` 使用）。          |

其他路由全部需要认证。

## 路由地图

### `/api/auth/*`

| Method | 路径                              | 摘要                                        |
| ------ | --------------------------------- | ------------------------------------------- |
| POST   | `/auth/login`                     | 用户名密码登录                              |
| POST   | `/auth/register`                  | 注册新用户                                  |
| POST   | `/auth/register/send-code`        | 发送注册验证码                              |
| POST   | `/auth/refresh`                   | 刷新 Access Token（同时轮换 Refresh Token） |
| POST   | `/auth/logout`                    | 注销并使当前 Refresh Token 失效             |
| POST   | `/auth/forgot-password/send-code` | 发送密码重置验证码                          |
| POST   | `/auth/forgot-password/reset`     | 凭验证码重置密码                            |
| GET    | `/auth/me`                        | 当前用户信息                                |

### `/api/auth/oauth/*`

| Method   | 路径                              | 摘要                           |
| -------- | --------------------------------- | ------------------------------ |
| GET      | `/auth/oauth/providers`           | 可用 OAuth Provider            |
| GET      | `/auth/oauth/:provider/authorize` | 获取 Provider 的授权跳转地址   |
| GET/POST | `/auth/oauth/:provider/callback`  | Provider 回调                  |
| POST     | `/auth/oauth/bind`                | 绑定到现有账号                 |
| POST     | `/auth/oauth/register-and-bind`   | 用 Provider 资料创建并绑定账号 |

### `/api/users/*`

用户 CRUD、角色、头像管理。所有端点需要认证。

### `/api/overview/*`

`GET /overview/stats` — KPI 卡片。`GET /overview/energy-chart` — 能耗图表数据。

### `/api/energy/*`

`GET /energy/areas` 与 `PUT /energy/areas` — 区域能源卡片读写。

### `/api/alerts/*`、`/api/faults/*`、`/api/maintenance/*`

对应表的 CRUD 接口。`/faults/stats` 返回快照行。

### `/api/reports/*`

报表计划 CRUD 与报表模板列表。注意：没有 `/instances` 端点；生成的报表通过队列 Worker 输出获取。

### `/api/configs`

平台配置单行的 `GET` 与 `PUT`。

### `/api/files/*`

| Method | 路径                 | 说明                                |
| ------ | -------------------- | ----------------------------------- |
| GET    | `/files`             | 列出上传文件。                      |
| POST   | `/files`             | multipart 上传，单文件最大 100 MB。 |
| GET    | `/files/:id`         | 仅元数据。                          |
| GET    | `/files/:id/preview` | 流式返回二进制。                    |
| DELETE | `/files/:id`         | 删除。                              |

### `/api/models/*`

与 `/files` 类似，但专门用于 3D 模型上传。文件落到 `uploads/models/`，对外通过 `/static/models/<filename>` 访问。注意：没有 `GET /models/:id`；使用 `GET /models/:id/file` 流式获取模型文件。

### `/api/iot/*`

代理上游 IoT 网关。请求/响应保持上游契约，EcoCtrl 透明处理 token 刷新（依赖 `iot_tokens` 表）。

| 方法 | 路径                                     | 说明                      |
| ---- | ---------------------------------------- | ------------------------- |
| GET  | `/iot/token`                             | 返回缓存的 Access Token。 |
| POST | `/iot/codes/values`                      | 读取当前点位值。          |
| POST | `/iot/codes/history`                     | 点位历史值。              |
| POST | `/iot/codes/set`、`/iot/codes/force-set` | 点位写值。                |
| POST | `/iot/alarms`、`/iot/alarm-configs`      | 报警历史与报警配置。      |

### `/api/system/*`

`GET /system/backup-schedule`、`PUT /system/backup-schedule`。

### `/api/workflows/*`

工作流 CRUD 与执行。所有端点需要认证。

| 方法   | 路径                        | 说明               |
| ------ | --------------------------- | ------------------ |
| GET    | `/workflows`                | 列出所有工作流     |
| POST   | `/workflows`                | 创建工作流         |
| GET    | `/workflows/:id`            | 获取单个工作流定义 |
| PUT    | `/workflows/:id`            | 更新工作流定义     |
| DELETE | `/workflows/:id`            | 删除工作流         |
| POST   | `/workflows/:id/trigger`    | 手动执行工作流     |
| GET    | `/workflows/:id/executions` | 列出工作流执行历史 |

### `/api/objects/*`

IoT 对象元数据 CRUD。对象代表上游 IoT 网关中的物理设备或数据点。

| 方法   | 路径           | 说明         |
| ------ | -------------- | ------------ |
| GET    | `/objects`     | 列出对象     |
| POST   | `/objects`     | 创建对象     |
| GET    | `/objects/:id` | 获取对象详情 |
| PUT    | `/objects/:id` | 更新对象     |
| DELETE | `/objects/:id` | 删除对象     |

### `/api/settings/*`

每用户设置（需认证）。

| 方法 | 路径        | 说明         |
| ---- | ----------- | ------------ |
| GET  | `/settings` | 获取用户设置 |
| PUT  | `/settings` | 更新用户设置 |

### `/api/public/settings/*`

公开平台配置（无需 token）。

| 方法 | 路径               | 说明             |
| ---- | ------------------ | ---------------- |
| GET  | `/public/settings` | 获取公开平台配置 |

### `/api/dashboard-model/*`

3D 场景配置。

| 方法 | 路径               | 说明             |
| ---- | ------------------ | ---------------- |
| GET  | `/dashboard-model` | 获取 3D 场景配置 |
| PUT  | `/dashboard-model` | 更新 3D 场景配置 |

### `/api/webhook`

工作流触发器的公开 Webhook 端点。

| 方法 | 路径             | 说明                        |
| ---- | ---------------- | --------------------------- |
| POST | `/webhook/:slug` | 通过 Webhook 标识触发工作流 |

## Swagger 自动登录

`/documentation` 中内嵌了一段脚本，会：

1. 捕获 `POST /auth/login` 与 `POST /auth/refresh` 的响应。
2. 把 Access 与 Refresh Token 写入 `localStorage`。
3. 调用 Swagger 的 `authActions.authorize` 自动应用 Bearer Token。
4. 后续 `/auth/refresh` 调用时自动填充 Refresh Token。

实际效果：**在 Swagger UI 的 "Try it out" 中调用一次 `/auth/login`，其他端点就自动解锁**。

## 新增一条路由

1. 在 `packages/server/src/routes/<resource>.ts` 中导出一个异步函数 `(fastify) => { ... }`。
2. 在文件中或独立模块定义 Zod 请求/响应 schema。
3. 实现处理函数 — 通过 `repositories/<resource>.ts` 访问数据，不要直接调用 Drizzle。
4. 在 `routes/index.ts` 中注册这个文件，指定前缀。
5. 如果新路由需要绕过认证，把它加进同一文件的 `publicPaths` 列表；否则它会自动继承 JWT 校验。

新增路由会自动出现在 OpenAPI 文档中 — 无需手动维护。
