---
title: 安全加固
description: JWT Secret 轮换、CORS 配置、CSP 策略、OAuth 凭据管理
---

# 安全加固

EcoCtrl 遵循纵深防御原则。本文介绍各安全层级的配置建议和操作步骤。

---

## JWT Secret 轮换

JWT (JSON Web Token) 用于 API 请求的身份认证。`JWT_SECRET` 是签名的核心密钥。

### 密钥强度要求

```bash
# 生成一个安全的 JWT_SECRET（至少 32 字符，建议 64 字符）
openssl rand -base64 64
```

### 完整轮换流程

更换 `JWT_SECRET` 会使所有已签发的 Access Token **立即失效**，但 Refresh Token 仍然有效：

```bash
### 更新环境变量
# docker/.env.local
JWT_SECRET=<new-secret>

### 重启 API 服务
docker compose up -d server

### 【可选】强制所有用户重新登录（使所有 Refresh Token 失效）
docker compose exec postgres psql -U ecoctrl -d ecoctrl -c "TRUNCATE refresh_tokens;"
```

| 步骤                    | 执行前                           | 执行后                            |
| ----------------------- | -------------------------------- | --------------------------------- |
| 仅更新 JWT_SECRET       | 用户在线，Access Token 仍有效    | 重启后所有 Access Token 立即失效  |
| 重启服务                | 用户收到 401，前端自动刷新 Token | Refresh Token 换取新 Access Token |
| TRUNCATE refresh_tokens | 用户可无感刷新                   | 所有用户被迫重新登录              |

### 生命周期建议

- **生产环境**：每 90 天轮换一次
- **安全事件后**：立即轮换（如发现密钥泄露或员工离职）

### 密钥存储

| 环境 | 存储方式                                                            |
| ---- | ------------------------------------------------------------------- |
| 开发 | `.env.local` 文件                                                   |
| 测试 | CI/CD Secrets + `.env.local`                                        |
| 生产 | 密钥管理服务（AWS Secrets Manager、HashiCorp Vault、1Password CLI） |

---

## CORS 配置

CORS (Cross-Origin Resource Sharing) 限制跨域请求的来源。

### 配置方式

```bash
# docker/.env.local
CORS_ORIGIN=https://admin.yourdomain.com,https://web.yourdomain.com
```

### 环境差异

| 环境 | `CORS_ORIGIN` 值                                          | 说明               |
| ---- | --------------------------------------------------------- | ------------------ |
| 开发 | `*`（默认允许所有来源）                                   | 方便本地调试       |
| 测试 | `http://localhost:4173,http://localhost:8081`             | 仅允许本地前端访问 |
| 生产 | `https://admin.yourdomain.com,https://web.yourdomain.com` | 仅允许受信域名     |

### 安全规则

- **禁止使用通配符**：生产环境永远不要设置 `CORS_ORIGIN=*`
- **只列出受信域名**：只包含实际需要访问 API 的前端域名
- **逗号分隔**：多个域名之间用 **英文逗号** 分隔

### 验证 CORS 配置

```bash
curl -H "Origin: https://evil-site.com" -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3000/api/health -v 2>&1 | grep -i "access-control"
```

正确响应应不返回 `Access-Control-Allow-Origin: https://evil-site.com`。

---

## Content-Security-Policy

CSP 通过 HTTP 响应头限制页面可以加载的资源来源，防止 XSS 攻击。

### 建议的生产环境 CSP

```caddyfile
# 在 Caddyfile 中添加
header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://*.tile.openstreetmap.org;
    connect-src 'self' https://api.openweathermap.org;
    font-src 'self';
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
"
```

| 指令          | 说明                                           |
| ------------- | ---------------------------------------------- |
| `default-src` | 所有资源类型的默认来源                         |
| `script-src`  | 允许自身脚本和内联脚本（_审查内联脚本安全性_） |
| `style-src`   | 允许自身和内联样式                             |
| `img-src`     | 允许自身、data URI、blob 和地图瓦片            |
| `connect-src` | 允许的 API 连接目标                            |
| `frame-src`   | 允许内嵌的 frame（如 WebTalk）                 |
| `object-src`  | 禁止 `<object>` 标签（防止插件类攻击）         |

> 添加 CSP 后请全面测试所有功能，特别是 3D 场景（WebGL）渲染是否正常。

---

## OAuth 凭据管理

微信和飞书登录需要配置 `APP_ID` 和 `APP_SECRET`。

### 安全建议

- **AppSecret 视同密码**：不要在代码仓库、日志或 URL 参数中泄露
- **定期轮换**：在 OAuth 提供商管理后台定期重新生成 AppSecret
- **最小权限**：只申请登录必需的权限范围（scope）
- **回调 URL 白名单**：在 OAuth 提供商后台严格限制回调 URL 为生产域名

### 验证配置

```bash
# 检查 OAuth 提供商列表
curl http://localhost:3000/api/auth/oauth/providers
```

预期响应示例：

```json
{
  "providers": ["wechat", "feishu"]
}
```

### WebTalk 凭据

WebTalk（内部通讯工具）的用户名和密码通过 Admin UI 提交，存储在服务端内存/会话中：

- 凭据不会持久化到数据库
- 退出登录时自动清除缓存的 WebTalk 认证凭据
- 每次 WebTalk 会话独立管理凭据生命周期

---

## Docker 网络隔离

### 网络架构

Compose 部署使用内部 bridge 网络，服务间通过服务名称互相访问：

```
┌─────────────────────────────────────────────────┐
│  ecoctrl_default  (bridge 网络)                   │
│                                                   │
│  ┌────────┐  ┌──────────┐  ┌───────┐  ┌────────┐│
│  │ server │──│ postgres │  │  web  │  │ admin  ││
│  │:3000   │  │:5432(内网)│  │:80(C) │  │:80(C)  ││
│  └────┬───┘  └──────────┘  └────┬──┘  └────┬───┘│
│       │                        │          │      │
│       └────────────────────────┴──────────┘      │
│                    (通过 Caddy 代理)               │
└──────────────────────────────────────────────────┘
      │
  :3000│:4173│:8081   ← 仅暴露这三个端口到宿主机
```

### 安全基线

| 措施                     | 说明                                         |
| ------------------------ | -------------------------------------------- |
| 最小暴露原则             | 仅向外暴露 admin(4173)、web(8081)、api(3000) |
| 数据库不对外暴露         | PostgreSQL 仅在内部网络中可访问              |
| MinIO 不对外暴露         | 对象存储仅在内部网络中可访问                 |
| 使用非 root 用户运行容器 | 所有应用容器使用 `node` 用户（非 root）      |
| Caddy 处理 TLS 和路由    | Caddy 作为反向代理处理 HTTPS 和路径重写      |

### 验证端口暴露

```bash
# 检查哪些端口暴露到宿主机
docker compose ps

# 验证数据库不可从宿主机直接访问（除非特意映射了端口）
psql -h localhost -U ecoctrl -d ecoctrl  # 应返回连接失败
```
