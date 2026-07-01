---
title: 认证与用户 API
description: 登录/注册/忘记密码、Token 管理、用户 CRUD、OAuth
---

# 认证与用户 API

认证与用户模块覆盖用户注册登录、Token 生命周期管理、用户 CRUD、个人设置以及 OAuth 第三方登录。

所有端点（除标记为公共外）均需携带 `Authorization: Bearer <accessToken>`。Access Token 默认 15 分钟过期，可通过 `/api/auth/refresh` 轮换。

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）

## 登录与注册

### POST /api/auth/login

**认证**: 公共

使用用户名或邮箱 + 密码登录，返回 Access Token 与 Refresh Token。

| 字段                     | 类型   | 说明                             |
| ------------------------ | ------ | -------------------------------- |
| `usernameOrEmail` (body) | string | 用户名或注册邮箱                 |
| `password` (body)        | string | 用户密码                         |
| **响应** `accessToken`   | string | JWT Access Token（默认 15 分钟） |
| **响应** `refreshToken`  | string | JWT Refresh Token（用于轮换）    |
| **响应** `user`          | object | 当前用户基本信息                 |

### POST /api/auth/register

**认证**: 公共

创建新用户。调用前需先通过 `/api/auth/register/send-code` 发送验证码。

| 字段              | 类型   | 说明                     |
| ----------------- | ------ | ------------------------ |
| `username` (body) | string | 用户名                   |
| `email` (body)    | string | 电子邮箱                 |
| `password` (body) | string | 密码                     |
| `code` (body)     | string | 6 位验证码（5 分钟有效） |

### POST /api/auth/refresh

**认证**: 公共

用 Refresh Token 换取新的 Access Token + Refresh Token 对。调用后原 Refresh Token 立即失效。

| 字段                    | 类型   | 说明                     |
| ----------------------- | ------ | ------------------------ |
| `refreshToken` (body)   | string | 当前有效的 Refresh Token |
| **响应** `accessToken`  | string | 新 Access Token          |
| **响应** `refreshToken` | string | 新 Refresh Token         |

## 密码管理

### POST /api/auth/forgot-password/send-code

**认证**: 公共

向注册邮箱发送 6 位密码重置验证码。

| 字段           | 类型   | 说明     |
| -------------- | ------ | -------- |
| `email` (body) | string | 注册邮箱 |

### POST /api/auth/forgot-password/reset

**认证**: 公共

凭验证码重置密码。

| 字段                 | 类型   | 说明     |
| -------------------- | ------ | -------- |
| `email` (body)       | string | 注册邮箱 |
| `code` (body)        | string | 验证码   |
| `newPassword` (body) | string | 新密码   |

## 当前用户

### GET /api/auth/me

返回已认证用户的详细信息。

| 响应字段    | 类型   | 说明     |
| ----------- | ------ | -------- |
| `id`        | number | 用户 ID  |
| `username`  | string | 用户名   |
| `email`     | string | 邮箱     |
| `avatar`    | string | 头像 URL |
| `role`      | string | 用户角色 |
| `createdAt` | string | 创建时间 |

## 用户管理 (CRUD)

基础路径: `/api/users/:id`

### GET /api/users/:id

获取指定用户的详细信息。需具有对应用户或管理员权限。

### PUT /api/users/:id

更新指定用户的字段（如邮箱、昵称、头像）。

| 字段                    | 类型   | 说明        |
| ----------------------- | ------ | ----------- |
| `email` (body, 可选)    | string | 新邮箱      |
| `username` (body, 可选) | string | 新用户名    |
| `avatar` (body, 可选)   | string | 头像文件 ID |

## 用户设置

### GET /api/settings

返回当前用户的个性化设置。

| 响应示例       |                                   |
| -------------- | --------------------------------- |
| `theme`        | `"light"` / `"dark"` / `"system"` |
| `language`     | `"zh-CN"` / `"en"`                |
| `timezone`     | `"Asia/Shanghai"`                 |
| `notification` | object（通知偏好）                |

### PUT /api/settings

更新当前用户的设置。仅需提供要修改的字段，未提供的字段保持不变。

## OAuth 第三方登录

### POST /api/auth/oauth/:provider/authorize

**认证**: 公共

| 参数               | 说明                        |
| ------------------ | --------------------------- |
| `:provider` (path) | 支持 `wechat` / `feishu` 等 |
| 响应 `redirectUrl` | 跳转到第三方授权页面的 URL  |

### GET /api/auth/oauth/:provider/callback

**认证**: 公共

第三方授权回调入口。根据回调参数自动完成登录或跳转。

### POST /api/auth/oauth/bind

将 OAuth 身份绑定到当前已登录账号。

| 字段              | 类型   | 说明         |
| ----------------- | ------ | ------------ |
| `provider` (body) | string | OAuth 提供商 |
| `code` (body)     | string | 授权码       |

### POST /api/auth/oauth/register-and-bind

使用第三方 OAuth 返回的用户资料自动创建账号并绑定。

| 字段              | 类型   | 说明                             |
| ----------------- | ------ | -------------------------------- |
| `provider` (body) | string | OAuth 提供商                     |
| `code` (body)     | string | 授权码                           |
| **响应**          |        | 自动创建用户 + 绑定 + 签发 Token |

> 完整的 API 参考可在运行时通过 Swagger UI 查阅（本地开发：`http://localhost:3000/documentation`，生产环境：`/documentation`）
