---
title: AI 与智能助手
description: AI 路由、双 Provider 架构、SSE 流输出、工具调用、Pet 系统
---

# AI 与智能助手

EcoCtrl 集成了 AI 对话能力和虚拟宠物（Pet）系统。AI 子系统提供多 Provider 的大语言模型调用、SSE 流式输出、可扩展工具注册和会话管理。Pet 子系统管理精灵模型上传、贴图提取和用户偏好设置。

## AI 提供者架构

AI 系统（`routes/ai.ts`）支持两个 LLM 提供者，通过环境变量切换：

| 环境变量      | 说明                                        |
| ------------- | ------------------------------------------- |
| `AI_PROVIDER` | `anthropic` 或 `openai`                     |
| `AI_API_KEY`  | API 密钥                                    |
| `AI_BASE_URL` | 自定义 API 端点（可选，用于代理或兼容接口） |
| `AI_MODEL`    | 模型名称                                    |

### Provider 适配

系统通过统一的 Provider 接口封装两个 SDK：

- **Anthropic**：使用 `@anthropic-ai/sdk`，支持 Claude 系列模型（如 `claude-sonnet-4-20250514`）
- **OpenAI**：使用 `openai` SDK，支持 GPT-4o 等模型

Provider 的选择在服务启动时通过环境变量固定，运行时不再切换。

## 对话流程

```
客户端发送 POST /api/ai/chat
    { message, sessionId?, context: { currentPage, currentRouteData? } }
    │
    ▼
  服务端创建/查找对话 Session
    │
    ▼
  构造 Prompt（包含系统指令 + 页面上下文）
    │
    ▼
  调用 LLM API（流式 SSE 输出）
    │
    ▼
  AI 回复逐 chunk 推送到客户端
    │
    ▼
  如果 AI 发起工具调用 → 执行工具 → 结果返回 → AI 继续回复
```

### SSE 流式输出

`POST /api/ai/chat` 接口通过 SSE 逐块返回 LLM 生成内容：

```
事件: message_start    →  { sessionId, timestamp }
事件: content_block    →  { type: "text", text: "..." }
事件: content_block    →  { type: "tool_use", name, input }
事件: tool_result      →  { toolCallId, result }
事件: message_complete →  { stopReason, usage }
```

## 工具调用

AI 可以调用系统工具来获取实时数据。工具通过 tool registry（`@/ai/tools/registry`）注册：

```typescript
interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: unknown) => Promise<unknown>;
}
```

内置工具包括：

| 工具名称          | 功能             |
| ----------------- | ---------------- |
| `getDeviceStatus` | 查询设备运行状态 |
| `getEnergyData`   | 查询能耗统计数据 |
| `getFaultList`    | 查询当前告警列表 |
| `getWeather`      | 查询天气信息     |

工具调用流程：LLM 返回 tool_use 块 → 服务器执行 handler → 结果回传给 LLM → LLM 生成最终回复。

## 对话管理

- Session 基于 `aiConversations` 表持久化
- 每个 Session 保留完整对话历史（messages 数组）
- 支持创建新对话、切换对话和删除历史对话
- 超过 token 限制时自动裁剪早期消息
- 会话 24 小时无活动后自动标记为过期

## Pet 系统

Pet 系统（`routes/pets.ts`）管理数字宠物的外观和行为配置：

| 端点                        | 方法   | 说明                                                |
| --------------------------- | ------ | --------------------------------------------------- |
| `/api/pets`                 | GET    | 获取可用宠物列表                                    |
| `/api/pets/:id/spritesheet` | GET    | 获取宠物的精灵图                                    |
| `/api/pets`                 | POST   | 上传新宠物（ZIP 包格式，含 spritesheet + metadata） |
| `/api/pets/:id`             | DELETE | 删除宠物                                            |

### 用户偏好 API

宠物偏好通过 AI preferences API 管理：

| 偏好项          | 说明         | 可选值                      |
| --------------- | ------------ | --------------------------- |
| theme           | 主题色       | `light` / `dark` / `custom` |
| voiceEnabled    | 语音反馈开关 | `true` / `false`            |
| voiceSpeed      | 语音速度     | `slow` / `normal` / `fast`  |
| petPositionX/Y  | 屏幕位置坐标 | 0 - 100                     |
| wakeWordEnabled | 唤醒词开关   | `true` / `false`            |

偏好存储在数据库 `pets_preferences` 表中，每次更新后可通过 SSE 推送到前端。

## 相关文件

- `packages/server/src/routes/ai.ts` — AI 聊天路由
- `packages/server/src/routes/pets.ts` — Pet 路由
- `packages/server/src/services/ai/` — AI 服务层
- `packages/server/src/services/ai/tools.ts` — 工具注册表
- `packages/server/src/schemas/pets.ts` — Pet 数据模型
