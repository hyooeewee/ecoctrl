---
title: WebTalk 代理 API
description: WebSocket 反向代理、认证方式、iframe CORS 策略
---

# WebTalk 代理 API

WebTalk 是 EcoCtrl 内置的 WebSocket 反向代理模块，用于将第三方 Web 应用嵌入到 Admin 管理后台。通过统一认证中转和 CORS 策略白名单，实现安全可控的第三方系统集成。

所有端点均需认证，除非另有说明。

> **相关子系统文档**：[WebTalk 反向代理设计](/reference/subsystems/webtalk)

![API 参考](/screenshots/admin-overview.png)

## 反向代理 (通配符路由)

WebTalk 使用一条通配符路由 `/*` 捕获并转发所有匹配的请求到上游目标服务。

### `/*` (通配符代理)

| 属性     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| 方法     | 全部 HTTP 方法（GET / POST / PUT / DELETE / PATCH / …） |
| 路径     | 通配符 `/*`，匹配所有子路径                             |
| 认证     | 需要通过 EcoCtrl 认证（Bearer Token）                   |
| 上游目标 | 从 WebTalk 配置中读取的目标第三方服务 URL               |

**行为说明**:

1. 请求到达 EcoCtrl 后端
2. 验证请求中的 `Authorization: Bearer <token>`
3. 从 WebTalk 配置中查找路由映射，确定上游目标 URL
4. 请求头转发：自动传递认证信息，可将 EcoCtrl 用户身份注入到上游请求中
5. 响应透传：上游响应直接返回给客户端（状态码、Headers、Body 均保持原样）

## 认证转发机制

WebTalk 在反向代理请求时，将 EcoCtrl 的认证身份转发给上游第三方系统：

| 转发方式    | 说明                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Header 注入 | 在转发请求头中注入 `X-EcoCtrl-User-Id`、`X-EcoCtrl-User-Name` 等标识 |
| Token 透传  | 可选将原始 Bearer Token 透传给上游                                   |
| 免登录嵌入  | 用户无需在第三方系统中再次登录                                       |

**配置要求**：上游第三方系统需信任 EcoCtrl 的 Header 注入，通常需要在白名单网络中部署。

## iframe CORS 策略

为支持在 Admin 后台中以 iframe 嵌入第三方 Web 应用，WebTalk 配置了以下策略：

| 策略                                       | 说明                                |
| ------------------------------------------ | ----------------------------------- |
| `Content-Security-Policy: frame-ancestors` | 仅允许 EcoCtrl Admin 域名作为父页面 |
| `X-Frame-Options: ALLOW-FROM`              | 兼容旧版浏览器的帧来源限制          |
| CORS 白名单                                | 预配置允许跨域访问的来源域名列表    |

**配置字段**：

| 字段             | 类型    | 说明                        |
| ---------------- | ------- | --------------------------- |
| `upstreamUrl`    | string  | 上游第三方服务的 URL        |
| `allowedOrigins` | array   | CORS 白名单                 |
| `injectHeaders`  | object  | 转发时注入的头部            |
| `wsSupport`      | boolean | 是否启用 WebSocket 代理支持 |

![API 参考](/screenshots/admin-overview.png)
