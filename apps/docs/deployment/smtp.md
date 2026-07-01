---
title: SMTP 邮件服务配置
description: 邮件提供者选型、SMTP 参数、SSL/TLS 配置验证
---

# SMTP 邮件服务配置

SMTP 配置使 EcoCtrl 能够发送注册验证码、密码重置邮件和系统通知。**如不使用 SMTP，注册和密码重置功能将无法正常工作**。

<!-- 配置表单在系统配置页面的 SMTP 选项卡中 -->

## 配置方式

SMTP 配置支持两种途径（优先级从高到低）：

1. **环境变量**（推荐）：在 `docker/.env.local` 中设置 `SMTP_*` 变量，服务端启动时自动同步到 `platform_configs` 表
2. **Admin 后台**：登录超级管理员账号，进入 **系统配置 → SMTP 设置** 在线修改

两种方式效果相同，环境变量方式更适合持续部署。

## 参数说明

| 参数        | 环境变量      | 说明                                                             |
| ----------- | ------------- | ---------------------------------------------------------------- |
| SMTP 服务器 | `SMTP_HOST`   | SMTP 服务器地址，如 `smtp.163.com`、`smtp.gmail.com`             |
| SMTP 端口   | `SMTP_PORT`   | 连接端口（SSL: `465`，TLS/STARTTLS: `587`，无加密: `25`）        |
| 用户名      | `SMTP_USER`   | SMTP 认证用户名，通常为邮箱地址                                  |
| 密码/授权码 | `SMTP_PASS`   | SMTP 密码或第三方授权码（如 163 邮箱、QQ 邮箱需使用授权码）      |
| SSL 模式    | `SMTP_SECURE` | `true`: 使用 SSL（端口 465）；`false`: 使用 STARTTLS（端口 587） |

## SSL 与 TLS 选择

| 模式         | 端口 | `SMTP_SECURE` | 说明                                         |
| ------------ | ---- | ------------- | -------------------------------------------- |
| **SSL**      | 465  | `true`        | 从连接开始就使用加密通道，推荐、兼容性最好   |
| **STARTTLS** | 587  | `false`       | 明文连接后升级为加密，部分企业邮件服务器使用 |
| **无加密**   | 25   | `false`       | 明文传输，仅限内网或测试环境                 |

> 大多数公有邮件服务（163、QQ、Gmail）推荐使用 SSL 端口 465。

## 常用邮件服务提供商配置

### 网易 163 邮箱

```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=yourname@163.com
SMTP_PASS=<授权码>     # 非登录密码，需在 163 设置中开启 SMTP 并获取授权码
SMTP_SECURE=true
```

### QQ 邮箱

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=yourname@qq.com
SMTP_PASS=<授权码>     # QQ 邮箱设置 → 账户 → 生成授权码
SMTP_SECURE=true
```

### Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=<应用专用密码>    # 需开启两步验证后生成 App Password
SMTP_SECURE=false
```

### 企业自建 SMTP

```env
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=25
SMTP_USER=notifications@yourcompany.com
SMTP_PASS=<密码>
SMTP_SECURE=false
```

> 内网 SMTP 服务器通常使用端口 25 无加密。如果服务运行在 Docker 中，请确保 `SMTP_HOST` 可从 Docker 容器内部访问。

## 同步机制

服务端启动时，`syncSmtpFromEnv()` 函数自动将环境变量中的 SMTP 参数同步到数据库 `platform_configs` 表：

```text
.env.local (SMTP_*)  ──→  env.ts (Zod 校验)  ──→  syncSmtpFromEnv()  ──→  platform_configs 表
```

这个同步仅在启动时执行。运行时修改 `platform_configs` 表中的 SMTP 配置同样即时生效，无需重启服务。

## 验证 SMTP 配置

### 方法一：Admin 后台测试邮件

1. 使用超级管理员账号登录 Admin 后台
2. 进入 **系统配置 → SMTP 设置**
3. 填写/确认 SMTP 参数
4. 点击 **发送测试邮件**，输入收件邮箱地址
5. 成功收到邮件则配置正确

<!-- 测试邮件发送成功后收件箱截图 -->

### 方法二：API 验证端点

超级管理员可以通过 API 直接验证 SMTP 连接：

```bash
# 仅验证连接（不发邮件）
POST /api/configs/verify-smtp
Authorization: Bearer <admin-jwt-token>

# 发送测试邮件
POST /api/configs/test-email
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json

{"to": "admin@example.com"}
```

### 方法三：查看服务端日志

```bash
docker compose logs server | grep -i smtp
```

正确配置后的日志输出示例：

```
info: [mailer] SMTP configuration validated successfully
```

错误的配置会显示具体错误（如连接超时、认证失败）。

## 常见问题

| 问题                       | 原因                                              | 解决方法                                        |
| -------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| 连接超时                   | `SMTP_HOST` / `SMTP_PORT` 不可达                  | 检查 Docker 容器能否解析域名并访问 SMTP 服务器  |
| 认证失败                   | `SMTP_USER` / `SMTP_PASS` 错误                    | 检查凭据，部分服务需使用授权码而非登录密码      |
| SSL/TLS 握手失败           | `SMTP_SECURE` 与端口不匹配                        | 确认端口 465 对应 `true`，端口 587 对应 `false` |
| 发送成功但收不到邮件       | 被收件方 SMTP 服务器拦截为垃圾邮件                | 检查收件箱的垃圾邮件文件夹                      |
| 发送方地址与认证用户不匹配 | 某些邮件服务器要求发件人地址必须与 SMTP USER 一致 | 确认 SMTP_USER 与 From 地址相同                 |
