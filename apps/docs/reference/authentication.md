# 认证机制

EcoCtrl 使用短生命周期的 JWT Access Token 配合可轮换的 Refresh Token。可选的 OAuth Provider（微信、飞书）在第三方身份握手完成后会颁发同样形态的 Token。

## Token 模型

| Token   | 有效期  | 存放位置                              | 签发方                                      |
| ------- | ------- | ------------------------------------- | ------------------------------------------- |
| Access  | 15 分钟 | 内存（admin） / `localStorage`（web） | `fastify.jwt.sign({ userId, username })`    |
| Refresh | 7 天    | `refresh_tokens` 表（保存 sha256）    | `crypto.randomBytes(32).toString("base64")` |

Access Token 携带 `{ userId, username }`，每个受保护路由的全局 `onRequest` 钩子里调用 `request.jwtVerify()` 进行校验。Refresh Token 是不可解析的随机串 — 数据库里只有它的 sha256 哈希，因此即使数据库泄漏也无法直接复用。

## 登录流程

```
POST /api/auth/login { username, password }
        │
        ▼
  bcrypt.compare(password, user.password)
        │
        ▼
  delete refresh_tokens where userId = ...
  insert refresh_tokens (userId, sha256(newRefresh), now+7d)
        │
        ▼
  200 { accessToken, refreshToken, user }
```

“先删除再插入” 的步骤意味着新设备登录会把上一个设备踢下线 — 这是有意的设计。多设备会话目前未对外提供；如确有需要，可在 `routes/auth.ts` 中删掉 `deleteRefreshTokensByUserId` 这一步。

## 刷新流程

前端在 Access Token 过期时会自动刷新。该接口返回 **新的 Token 对**：

```
POST /api/auth/refresh { refreshToken }
        │
        ▼
  hash = sha256(refreshToken)
  row  = SELECT * FROM refresh_tokens WHERE tokenHash = hash AND expiresAt > now
        │
        ▼
  delete that row              （旧 Refresh Token 立即失效）
  insert new row with new hash （expiresAt = now + 7d）
        │
        ▼
  200 { accessToken, refreshToken }
```

这就是 _Rotating Refresh_：旧的 Refresh Token 不能再次使用。如果传来的 hash 已经不存在，接口返回 `401`，客户端必须重新登录。

## 注册流程

注册前必须完成邮件验证码校验。

```
POST /auth/register/send-code { email }
        │  （服务端在内存中保存 { code, expiresAt: now+5min, purpose: "register" }）
        ▼
        smtp 发送 6 位验证码

POST /auth/register { username, email, password, code }
        │
        ▼
  校验验证码（一次性、5 分钟有效）
  bcrypt.hash(password, 10)
  insert users
  delete refresh_tokens where userId = newUser.id
  insert new refresh_tokens row
        │
        ▼
  201 { accessToken, refreshToken, user }
```

默认角色取自 `USER_ROLE_LIST` 的最低项（当前为 `viewer`）。如需提权，在 admin 后台的用户管理页中调整。

## 密码重置流程

与注册流程结构相同：

1. `POST /auth/forgot-password/send-code` — 服务端保存 5 分钟有效的 `purpose: "reset"` 验证码。
2. `POST /auth/forgot-password/reset { email, code, newPassword }` — 校验验证码、用 bcrypt 哈希新密码并写入 `users`。

已有的 Access Token 在过期前仍然有效，但没有新密码就无法签发新 Token。如果想立即吊销，可同时清除该用户的 Refresh Token，使下一次刷新失败。

## OAuth 流程（微信 / 飞书）

在 `packages/server/.env.local` 中配置 Provider 凭据：

```bash
WECHAT_APPID=...
WECHAT_SECRET=...
FEISHU_APPID=...
FEISHU_SECRET=...
```

已配置的 Provider 会出现在 `GET /api/auth/oauth/providers` 中；admin UI 据此渲染对应按钮。

```
1. 浏览器 → GET /api/auth/oauth/<provider>/authorize
              ← 返回 Provider 跳转地址
2. 浏览器 → 在弹窗打开 Provider 授权页
3. Provider → 回调 → GET /api/auth/oauth/<provider>/callback
              服务端用 code 换取 Provider Token，并拉取用户信息
4. 两种结果：
   a) 已存在 oauth_accounts 与 users 的关联
      → 服务端签发 EcoCtrl 的 JWT 对，弹窗将其 postMessage 给主窗口
   b) 还没有关联
      → 前端引导用户绑定：POST /auth/oauth/bind
        （或 /auth/oauth/register-and-bind 用于尚未注册的用户）
```

绑定完成后，用户既可以用账号密码登录，也可以走 OAuth — 两种方式得到的都是同一行 `users` 记录。

## 客户端 Token 存放位置

| App          | Access Token                                  | Refresh Token                                  |
| ------------ | --------------------------------------------- | ---------------------------------------------- |
| `apps/web`   | `localStorage`                                | `localStorage`                                 |
| `apps/admin` | `localStorage`                                | `localStorage`                                 |
| Swagger UI   | `localStorage`（`swagger_auto_access_token`） | `localStorage`（`swagger_auto_refresh_token`） |

前端共享一个类 Axios 客户端（`apps/admin/src/api/request.ts`、`apps/web/app/lib/api.ts`），它会：

1. 给每个请求加上 `Authorization: Bearer <accessToken>`。
2. 拦截 `401`，调用一次 `/auth/refresh` 然后用新 Token 重放原始请求。
3. 刷新失败时清空 storage 并跳转登录页。

## 公共路由

完整列表请见 [API 路由 — 公共路由](/reference/api#公共路由（无需-token）)。`routes/index.ts` 中的钩子会用 `request.url.startsWith(p)` 比对显式白名单 — 新增公共路由必须把路径加入这个列表。

## 运维要点

- **轮换 `JWT_SECRET`**：所有已签发的 Access Token 立即失效；但 Refresh Token 仍有效，用户可以无需重登就刷出新 Access Token。如果想强制全员下线，搭配清空 Refresh Token（`TRUNCATE refresh_tokens`）即可。
- **延长会话**：编辑 `packages/server/index.ts` 中的 `expiresIn: "15m"` 调整 Access Token 寿命；编辑 `routes/auth.ts` 中的 `7 * 24 * 60 * 60 * 1000` 调整 Refresh Token 寿命。
- **审计在线会话**：执行 `SELECT userId, COUNT(*) FROM refresh_tokens GROUP BY userId` 即可看到当前活跃会话（目前每个用户固定为 0 或 1）。

## 基于角色的访问控制

用户有一个 `role` 字段，取值来自 `USER_ROLE_LIST`。新注册用户的默认角色是列表中的最低项（当前为 `viewer`）。角色校验在路由处理器或 Fastify decorator 中完成，没有中间件层面的 RBAC 网关。admin 后台的用户管理页面支持升降级用户角色。
