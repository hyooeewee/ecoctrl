---
title: Web 前端架构
description: React Router 7 路由（/、/settings、/.well-known）、BabylonJS 3D 场景集成、Bento Grid 仪表盘布局系统、Edit Mode 状态管理、5 个 Zustand store（auth/settings/lighting/pet/widgetData）、i18n 系统、SSE 客户端、Screen Pet 组件架构
---

# Web 前端架构

## 概述

Web 前端是面向公众的 3D 门户，基于 React 19 + React Router 7（framework 模式）+ TypeScript + TailwindCSS v4。核心能力是 BabylonJS 3D 场景渲染和可拖拽的 Bento Grid 仪表盘。前端仅做 CSR（客户端渲染），不涉及 SSR，构建产物为静态 SPA bundle。

## 路由结构

路由定义在 `apps/web/app/routes.ts`，共 3 个入口：

```typescript
export default [
  layout("routes/dashboard-layout.tsx", [
    index("routes/home.tsx"), // / → 仪表盘主页
    route("settings", "routes/settings.tsx"), // /settings → 设置页
  ]),
  route(".well-known/*", "routes/well-known.tsx"), // 开发工具探测
] satisfies RouteConfig;
```

- **/（首页）**：Bento Grid 仪表盘 + BabylonJS 3D 场景视图。用户登录后可编辑仪表盘布局。
- **/settings（设置页）**：用户偏好设置，包含主题切换、语言选择、密码修改等。
- **/.well-known/（开发工具探测）**：浏览器扩展或开发工具通过 Well-Known URI 机制探测应用信息。

使用 React Router 7 的 `layout route` 模式，`home` 和 `settings` 共享 `dashboard-layout.tsx` 布局组件。

## BabylonJS 3D 场景集成

核心 3D 场景组件位于 `apps/web/app/components/dashboard/building-view.tsx`，加载流程如下：

```text
1. 组件挂载后调用 /api/public/model 获取场景配置（模型 URL、相机预设、热点列表、标签注释）
2. 创建 Babylon.js Engine 实例（Canvas 尺寸自适应容器大小）
3. 创建 Scene 实例，配置环境贴图、光照和雾效
4. 通过 SceneLoader.ImportMeshAsync 加载 glTF / glB 模型
5. 根据配置应用相机预设（预设位置 + 目标点）
6. 渲染热点标记（HTML overlay 定位到 3D 坐标）和标签注释
7. 监听用户交互：点击热点触发面板展开、鼠标拖拽旋转场景、滚轮缩放
8. 窗口 resize 时自动调整 Engine 尺寸
9. 组件卸载时调用 engine.dispose() 清理资源
```

支持的模型格式为 glTF 2.0（.gltf + .bin 分离文件）和 glB 二进制格式。模型文件通过 `/api/uploads` 上传管理。

### 场景性能优化

- 模型加载期间显示骨架屏占位
- 使用 `engine.setHardwareScalingLevel()` 控制渲染分辨率平衡性能
- 非可见标签延迟渲染（IntersectionObserver）
- Camera 惯性控制在低帧率时自动降级

## Bento Grid 仪表盘布局系统

主页使用 12 列 CSS Grid 排版组件网格。每个组件的网格坐标（`layoutX` / `layoutY` / `layoutW` / `layoutH`）存储在数据库 `dashboard_widgets` 表中。

### 组件类型与数据源

| 组件类型 | 数据源                             | 说明                                   |
| -------- | ---------------------------------- | -------------------------------------- |
| 统计卡片 | `dashboard_stats` / IoT 点位       | 带趋势指示器的大型数字 KPI             |
| 图表     | `energy_readings`、`fault_stats`   | 折线图、柱状图、饼图                   |
| 列表     | `alerts`、`maintenance_reminders`  | 可滚动告警 / 任务列表                  |
| 天气     | OpenWeatherMap API                 | 当前天气卡片（API Key 缺失时自动隐藏） |
| 能耗图表 | `energy_readings` + `energy_areas` | 多系列能耗分析图                       |

### 布局数据结构

```typescript
// dashboard_widgets 表字段（简化）
interface DashboardWidget {
  id: string;
  type: "stats" | "chart" | "list" | "weather" | "energy";
  layoutX: number; // 网格 X 坐标（0-11）
  layoutY: number; // 网格 Y 坐标
  layoutW: number; // 宽度（占几列，1-12）
  layoutH: number; // 高度（占几行）
  config: Record<string, unknown>; // 组件专属配置
}
```

布局数据通过 `/api/dashboard` 端点查询，`/api/dashboard/settings` 端点保存编辑结果。

## Edit Mode 状态管理

仪表盘支持编辑模式，用户可自定义组件排布。状态由 `widgetData` store 中的 `isEditing` 标志控制。

```text
Edit Mode 生命周期:
  1. 用户点击「编辑」按钮 → isEditing = true
  2. 组件进入可拖拽状态（拖拽手柄、尺寸控制点可见）
  3. 用户操作:
     a. 拖拽组件到新位置 → 更新 layoutX / layoutY
     b. 拖动调整组件尺寸 → 更新 layoutW / layoutH
     c. 从类型面板拖入新组件 → POST /api/dashboard
     d. 点击组件删除按钮 → DELETE /api/dashboard/{id}
  4. 用户点击「保存」→ PUT /api/dashboard/settings
  5. 保存成功 → isEditing = false，widgetData 刷新
  6. 用户点击「取消」→ isEditing = false，恢复原始布局
```

暂存状态仅在内存中维护，未保存前刷新页面将丢失编辑内容。

## 5 个 Zustand Store

### auth — 认证状态

```typescript
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (access: string, refresh: string) => void;
  clearAuth: () => void;
}
```

Token 存储于 `localStorage`（key: `ecoctrl-auth`）。所有 API 请求通过 axios interceptor 自动附加 `Authorization: Bearer` 头，遇到 401 时自动尝试 Refresh Token 续期。

### settings — 用户偏好

```typescript
interface SettingsState {
  theme: "system" | "light" | "dark";
  language: "zh-CN" | "en-US";
  dashboardLayout: DashboardWidget[];
  setTheme: (theme: SettingsState["theme"]) => void;
  setLanguage: (lang: SettingsState["language"]) => void;
}
```

### lighting — 照明控制（SSE 联动）

缓存照明控制状态。与 SSE 的事件推送联动，实时更新照明组状态（`off` / `half` / `on`）。

```typescript
interface LightingState {
  groups: Record<string, LightingGroup>;
  setGroupState: (id: string, state: LightingState) => void;
  syncFromSSE: (event: LightingSSEEvent) => void;
}
```

当 SSE 推送照明状态变更事件时，`syncFromSSE` 直接更新对应组的显示状态，无需重新请求 API。

### pet — 屏幕宠物

管理 AI 屏幕宠物（Screen Pet）的状态：

```typescript
interface PetState {
  theme: PetTheme; // 宠物外观主题
  voice: boolean; // 语音反馈开关
  position: { x: number; y: number }; // 屏幕上的像素坐标
  animation: string; // 当前动画状态（idle / speak / walk / sleep）
  setTheme: (theme: PetTheme) => void;
  setPosition: (pos: { x: number; y: number }) => void;
}
```

宠物位置持久化到 localStorage，跨会话保持。语音反馈依赖浏览器 Web Speech API。

### widgetData — 仪表盘数据缓存

```typescript
interface WidgetDataState {
  data: Record<string, unknown>; // 各组件的数据缓存
  isLoading: Record<string, boolean>; // 加载状态
  isEditing: boolean; // 是否处于编辑模式
  fetchWidgetData: () => Promise<void>;
  setEditing: (editing: boolean) => void;
}
```

数据定时轮询（间隔 30 秒），每次轮询仅请求当前仪表盘上可见组件所需的数据端点。

## i18n 国际化系统

Web 前端使用自研 i18n 系统（非 react-i18next 或其他第三方库），通过 Zustand store 管理语言状态。

### 文件结构

```
apps/web/app/locales/
├── index.ts          # 语言注册与切换逻辑
├── en-US.ts          # 英文翻译键值对（扁平对象）
└── zh-CN.ts          # 中文翻译键值对
```

### 实现方式

```typescript
// locales/en-US.ts
export const en = {
  "dashboard.title": "Dashboard",
  "dashboard.edit": "Edit Layout",
  "settings.title": "Settings",
  "settings.theme": "Theme",
  // ...
};
```

Zustand store 中存储当前语言代码，组件通过 `useTranslation()` hook 获取翻译文本：

```typescript
function useTranslation() {
  const lang = useSettingsStore((s) => s.language);
  const translations = lang === "zh-CN" ? zh : en;
  return (key: string) => translations[key] ?? key;
}
```

语言切换即时生效，无需页面刷新。新语言通过扩展 `locales/` 目录下的文件并注册到 `index.ts` 即可添加。

## SSE 客户端

Web 前端的长连接数据推送通过 SSE（Server-Sent Events）实现。SSE 客户端封装在自定义 hook 或服务模块中，连接管理包括：

- **自动重连**：连接断开后以指数退避策略（1s / 2s / 4s / 8s / 16s，上限 30s）尝试重连
- **事件分发**：按事件类型（`lighting` / `alert` / `maintenance` / `energy`）分发到对应 store 或 handler
- **生命周期**：页面可见时连接，页面隐藏时断开（`visibilitychange` 事件控制）

SSE 端点路径为 `/api/sse`，客户端在认证成功后发起连接。

## Screen Pet 组件架构

屏幕宠物（Screen Pet）是 Web 前端的特色功能，一个浮动在页面上的 AI 角色组件。

### 组件结构

```
ScreenPet
├── PetRenderer        # 宠物渲染（CSS sprite / Lottie 动画）
├── SpeechBubble       # 对话气泡（AI 回复的文本展示）
├── DragHandle         # 拖拽控制（允许用户在屏幕任意位置拖动宠物）
├── VoiceController    # 语音输入/输出（Web Speech API 封装）
└── ActionMenu         # 交互菜单（主题切换、语音开关、隐藏）
```

### 交互流程

```text
1. 用户点击宠物 → 触发问候动画 + 随机对话气泡
2. 用户长按并通过 DragHandle 拖拽 → 更新 PetState.position
3. 用户录入语音（VoiceController 激活）→ 语音转文字 → 调用 AI API → 响应显示在 SpeechBubble
4. 宠物根据场景自动切换动画状态：
   - idle（空闲）→ 轻微浮动
   - speak（说话）→ 对话气泡出现时
   - walk（移动）→ 被拖拽时
   - sleep（睡眠）→ 页面闲置超过 5 分钟
```

### 数据流

```text
用户语音 → Web Speech API (SpeechRecognition)
         → AI API（Claude / OpenAI 文本生成）
         → SpeechBubble 显示文本
         → 可选：Web Speech API (SpeechSynthesis) 语音播报
```

## 构建与部署

- 构建工具：`vp build`（vite-plus 封装 Rolldown）
- 输出目录：`apps/web/dist/`
- Docker 镜像：SPA bundle + Caddyfile（反向代理配置）
- 服务端口：8081（Docker Compose 默认）
- 部署模式：纯静态 CSR，所有动态数据通过 API 获取
