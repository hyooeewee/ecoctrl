---
title: WebTalk 反向代理
description: 同源 iframe 代理、通配符路由、hop-by-hop 头部过滤、fetch 自动解压缩
---

# WebTalk 反向代理

## 解决的问题

WebTalk 是一个第三方 IoT 设备管理平台。Admin 后台通过 iframe 嵌入其管理界面时，浏览器同源策略会阻止跨域 Cookie 的传递，导致会话无法维持。

WebTalk 反向代理（`routes/webtalk.ts`）通过通配符路由 `/*` 将所有 `/api/webtalk/*` 请求透明地转发到上游的 WebTalk 服务，使 iframe 保持与 Admin 后台同源，从而解决跨域 Cookie 问题。

## 工作原理

```
Admin 浏览器 iframe → /api/webtalk/* (同源)
    │
    ▼
  Fastify webtalk.ts (通配符 /*)
  ─ 保留原始请求方法、URL 路径和查询参数
  ─ 转发 Authorization 等必要头部
  ─ 过滤 hop-by-hop 头部
    │
    ▼
  上游 WebTalk 服务器 (env.BASE_URL)
    │
    ▼
  响应返回 → fetch 自动解压缩 → 转发给浏览器
```

## 实现细节

### 请求转发

代理转发保留原始请求的完整性：

- 保留原始 HTTP 方法（GET、POST、PUT、DELETE 等）
- 保留原始 URL 路径和查询参数
- 转发 `Authorization` 和 `Content-Type` 等必要头
- 支持请求体透传（JSON、表单、二进制）

### 头部过滤

转发响应时会过滤 hop-by-hop 头部。这些头部是 HTTP 逐跳元数据，不应转发给客户端：

- `connection`
- `keep-alive`
- `transfer-encoding`
- `te`
- `trailer`
- `upgrade`
- `proxy-authorization`
- `proxy-authenticate`

### 响应处理

- 使用 `fetch` API 向上游发起请求，利用其原生解压缩能力
- 自动处理 `gzip`、`deflate`、`br`（Brotli）等压缩编码
- 响应头部同样过滤 `content-encoding` 和 `content-length`，避免与分块传输冲突
- 支持大响应分块传输（streaming）
- 设置 `cache-control` 为 `no-store` 防止响应被缓存

### 代理逻辑伪代码

```typescript
async function proxy(req, reply) {
  const upstreamUrl = `${env.BASE_URL}${req.url}`;
  const headers = filterHopByHop(req.headers);

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method !== "GET" ? req.body : undefined,
  });

  // 过滤响应头中的 hop-by-hop 头部
  const responseHeaders = filterHopByHop(upstreamRes.headers);

  reply.code(upstreamRes.status);
  reply.headers(responseHeaders);
  reply.send(upstreamRes.body); // 流式发送
}
```

## 安全

- WebTalk 代理路径需要有效的 JWT 认证（同 Admin API）
- 上游 URL 从 `env.BASE_URL` 读取，不暴露给客户端
- 不会将上游认证凭据透传给浏览器
- 对上游响应做严格的头部白名单过滤

## 配置

| 环境变量           | 说明                        |
| ------------------ | --------------------------- |
| `WEBTALK_BASE_URL` | 上游 WebTalk 服务器基础 URL |

## 相关文件

- `packages/server/src/routes/webtalk.ts` — WebTalk 反向代理路由
- `packages/server/src/utils/http.ts` — HTTP 工具函数（hop-by-hop 过滤等）
