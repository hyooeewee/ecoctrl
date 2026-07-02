---
title: 第三方系统集成
description: WebTalk 反向代理、输入用户名密码认证、iframe 内嵌管理界面
---

# 第三方系统集成

![第三方系统集成](/screenshots/admin-advanced.png)

高级管理（Advanced Management）页面提供第三方系统集成功能。

## WebTalk 集成

WebTalk 是一个第三方 IoT 设备管理平台，EcoCtrl 通过反向代理将其管理界面嵌入到 Admin 后台中。

#> 技术细节：反向代理架构见 [WebTalk 反向代理](/reference/subsystems/webtalk.md)

## 配置步骤

1. 在第三方系统集成页面输入 WebTalk 系统的**用户名和密码**
2. 点击「提交认证」
3. 认证成功后，页面下方以 iframe 方式内嵌 WebTalk 管理界面

### 技术原理

- 认证过程由 EcoCtrl 服务端代为完成（`/api/webtalk/*` 路由）
- 后续所有 WebTalk 请求通过 EcoCtrl 服务端代理转发
- iframe 保持同源，解决了跨域 Cookie 问题

## 配置重置

- 重新输入凭据可更新认证信息
- 退出登录时清除缓存的认证凭据
