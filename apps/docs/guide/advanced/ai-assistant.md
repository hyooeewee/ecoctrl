---
title: AI 智能助手
description: Screen Pet 交互、AI 对话、宠物主题切换、语音输入输出
---

# AI 智能助手

![AI 智能助手](/screenshots/web-3d.png)

Web 门户的屏幕宠物（Screen Pet）是一个可爱又实用的 AI 助手。

> 技术细节：AI 提供者架构与工具调用机制见 [AI 与智能助手](/reference/subsystems/ai-pet.md)

## Screen Pet

### 显示与交互

- 一个浮动的小宠物显示在 Web 门户页面右下角
- **可拖拽**：拖拽宠物头像可在屏幕上任意移动位置（位置通过 `localStorage` 持久化）
- **主题切换**：可从服务器获取宠物列表，切换不同外观主题
  - 宠物以 sprite sheet（精灵图）zip 包形式上传
  - 由 `pets-api.ts` 从 `/api/pets` 端点获取

### AI 对话

点击宠物弹出聊天界面：

- **文字输入**：在聊天输入框中输入消息
- **语音输入**：支持语音输入（通过 `useVoiceInput` hook）
- **语音输出**：AI 回复支持 TTS 朗读（通过 `useVoiceOutput` hook）
- **流式响应**：AI 回复通过 SSE 流式输出，逐 token 显示
- **对话历史**：同一 Session 内的对话保持上下文

### AI 能力

- 基于 Anthropic Claude 或 OpenAI 提供 AI 能力（由服务端 `AI_PROVIDER` 环境变量决定）
- 支持**工具调用**：AI 可以查询设备状态、能耗数据等
- 回复内容结合当前页面上下文（`context: { currentPage, currentRouteData }`）

## 偏好设置

在 Web 设置页的「通用」分区可管理 AI 助手偏好：

| 设置     | 说明                 |
| -------- | -------------------- |
| 宠物主题 | 切换宠物的外观       |
| 启用语音 | 开关语音输入/输出    |
| 语速     | 0.5x - 2.0x 语速调节 |
