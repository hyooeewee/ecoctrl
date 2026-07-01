---
title: 实时通信 (SSE)
description: Server-Sent Events 架构、令牌认证、事件类型、心跳机制、队列积压处理
---

# 实时通信 (SSE)

EcoCtrl 使用 Server-Sent Events (SSE) 实现服务器到客户端的实时数据推送。

## 架构

```
路由层 (routes/events.ts)
    │ POST /token 签发 SSE JWT
    │ GET  /events SSE 连接（流式响应）
    ▼
SSE Manager (sse/manager.ts)
    │ 连接管理、心跳、广播
    ▼
SSE 事件队列 → 各连接通道
    │
    ▼
浏览器 EventSource 接收
```

## 令牌认证

SSE 连接使用独立的短期 JWT 令牌：

- 先调用 `POST /api/events/token` 获取令牌（30 秒有效期）
- 使用令牌建立 SSE 连接 `GET /api/events?token=xxx`
- 令牌中包含 userId 和 purpose: "sse"
- 30 秒过期后需重新获取

## 心跳机制

- 服务端每 **30 秒**发送心跳事件
- 心跳包含事件类型 `heartbeat` 和当前时间戳
- 客户端检测到心跳停止超过 90 秒可判定连接断开

## 事件类型

| 事件              | 说明               | payload 结构                |
| ----------------- | ------------------ | --------------------------- |
| `widget_update`   | 仪表盘组件数据更新 | `{ metricKey, type, data }` |
| `widget_delete`   | 仪表盘组件数据清除 | `{ metricKey }`             |
| `lighting_update` | 照明状态变更       | `{ labelId, groups }`       |

## 队列积压处理

- 事件先入队到内存队列，再逐个发送
- 队列积压时优先发送最新事件
- 连接断开时清空积压，避免重连后大量过期事件暴发

## 数据流

```
Admin/Server 端发送事件 → SSE Manager
    → 序列化 → 写入响应流（text/event-stream）
    → 浏览器 EventSource → parse → store dispatch → UI 更新
```
