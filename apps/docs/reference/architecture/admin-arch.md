---
title: Admin 前端架构
description: React 19 SPA、Tab 路由（Zustand 驱动，非 React Router）、16 个页面组件与子 Tab 嵌套模式（tabStoreKey）、认证守卫流程、LayoutShell + SidebarNav + Header 布局体系、3 个全屏沉浸式页面（DashboardModel / WorkflowCanvas / LogViewer）、SSE 集成（SseProvider）
---

# Admin 前端架构

## 概述

Admin 后台是一个单页应用（SPA），基于 React 19 + TypeScript + TailwindCSS v4。与多数后台应用不同，**Admin 未使用 React Router**，而是通过 Zustand store 中的 `activeTab` 状态实现 Tab 式路由。这种设计简化了渲染逻辑，无需 URL 路由匹配即可在多个页面间切换。

## Tab 路由系统

### 核心机制

路由状态存储在 `apps/admin/src/store/appStore.ts` 中的 `useAppStore`：

```typescript
interface AppState {
  activeTab: string; // 当前活动 Tab，决定渲染哪个页面组件
  setActiveTab: (tab: string) => void;

  // 子 Tab（页面内部导航），每个页面可维护独立的子 Tab 状态
  energyTab: string; // "overview" | "charts" | "areas"
  faultsTab: string; // "list" | "stats"
  dashboardModelTab: string; // "hotspots" | "labels" | "config"
  modelsTab: string; // "models" | "upload"
  workflowsTab: string; // "workflows" | "templates"
  // 其他子 Tab...
}
```

Tab 状态通过 `zustand/middleware` 的 `persist` 插件持久化到 `localStorage`（storage key 为 `ecoctrl-admin-storage`）。页面刷新后恢复上次的 Tab 和子 Tab 状态。

### 16 个页面组件

`App.tsx` 通过 `switch(activeTab)` 渲染对应页面组件：

| Tab Key              | 组件               | 说明                                                           |
| -------------------- | ------------------ | -------------------------------------------------------------- |
| `overview`           | Overview           | 仪表盘总览，显示 KPI 卡片和趋势图表                            |
| `config`             | Config             | 平台全局配置                                                   |
| `accounts`           | Accounts           | 用户账户管理（CRUD + 角色分配）                                |
| `models`             | Models             | 3D 模型文件管理（上传、列表、删除）                            |
| `settingsGroup`      | DashboardModel     | **全屏沉浸** — 3D 场景编辑器，配置热点、标签、相机的可视化工具 |
| `workflows`          | Workflows          | 工作流列表与模板管理                                           |
| `workflowCanvas`     | WorkflowCanvasPage | **全屏沉浸** — 工作流可视编辑画布，支持节点拖拽与连线          |
| `logViewer`          | LogViewerPage      | **全屏沉浸** — 工作流执行日志查看器，支持按时间/级别过滤       |
| `reports`            | Reports            | 报表生成与管理                                                 |
| `maintenance`        | Maintenance        | 维护任务管理与调度                                             |
| `faults`             | Faults             | 故障记录与统计                                                 |
| `energy`             | Energy             | 能耗数据分析                                                   |
| `advancedManagement` | AdvancedManagement | 高级管理功能                                                   |
| `profile`            | Profile            | 当前用户个人信息编辑                                           |
| `preferences`        | Preferences        | 偏好设置（主题、密度、通知、布局等）                           |
| `Login`（独立）      | Login              | 登录页面，仅未认证时展示；不包含主布局组件                     |

### 子 Tab 嵌套模式（tabStoreKey pattern）

多个页面组件内部维护子 Tab 导航。子 Tab 状态同样存储在 `useAppStore` 中，每个页面有自己的子 Tab Key：

```typescript
// appStore.ts 中的子 Tab 字段定义
energyTab: "overview"; // Energy 页面：总览 / 图表 / 区域
faultsTab: "list"; // Faults 页面：列表 / 统计
dashboardModelTab: "hotspots"; // DashboardModel：热点 / 标签 / 配置
modelsTab: "models"; // Models：模型列表 / 上传
workflowsTab: "workflows"; // Workflows：工作流 / 模板
```

页面组件内通过以下方式读写子 Tab：

```typescript
function EnergyPage() {
  const subTab = useAppStore((s) => s.energyTab);
  const setSubTab = useAppStore((s) => s.setEnergyTab);

  switch (subTab) {
    case "overview": return <EnergyOverview />;
    case "charts":   return <EnergyCharts />;
    case "areas":    return <EnergyAreas />;
  }
}
```

这种模式避免了 URL 参数管理，子 Tab 状态天然持久化且全局可访问。

## 认证守卫

认证逻辑实现在 `App.tsx` 顶层：

```text
应用启动流程:
  1. 检查 localStorage 中的 Access Token
  2. 有 Token:
     a. 调用 GET /api/auth/me 验证有效性
     b. 有效 → 加载用户偏好 → 渲染主界面（侧边栏 + 内容区）
     c. 无效或 401 → 清空 Token → 渲染 Login 页面
  3. 无 Token → 直接渲染 Login 页面
```

### 登录流程

```text
Login 页面:
  1. 用户输入用户名 + 密码 → 提交
  2. POST /api/auth/login → 返回 { accessToken, refreshToken, user }
  3. onLogin 回调:
     a. 存储 Token 到 localStorage
     b. 设置 useAppStore 中的用户状态
     c. 调用 GET /api/auth/me/state 加载用户偏好
     d. activeTab 切换到上次退出时的 Tab（从 localStorage 恢复）
     e. 渲染主布局
```

### 登出流程

```text
1. 用户点击登出（侧边栏底部或 Header 中的退出按钮）
2. ClearAuth: 清除 Token、用户数据、子 Tab 状态
3. activeTab 置为 "Login"
4. 可选：调用 POST /api/auth/logout 通知服务端作废 Refresh Token
```

## 布局组件体系

### LayoutShell

`App.tsx` 中定义的主布局有两种模式，根据当前 activeTab 动态切换。

**标准布局**（适用于 13 个非沉浸式页面）：

```tsx
<div className="bg-background text-foreground flex h-screen">
  <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
  <div className="flex h-full min-w-0 flex-1 flex-col">
    <Header activeTab={activeTab} showBreadcrumb={effectivePrefs.showBreadcrumb} />
    <main className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">{pageContent}</ScrollArea>
    </main>
  </div>
</div>
```

**沉浸式布局**（适用于 `settingsGroup` / `workflowCanvas` / `logViewer` 三个页面）：

```tsx
<div className="h-screen w-screen overflow-hidden">{fullScreenPageContent}</div>
```

沉浸式布局隐藏侧边栏和顶栏，将全屏空间留给 3D 场景编辑器、可视工作流画布、日志面板等需要大量操作空间的页面。

### SidebarNav

侧边栏组件渲染导航项列表。每项包含图标（lucide-react）和文本标签。点击触发 `setActiveTab(tabKey)`。侧边栏宽度固定，可折叠（收窄为仅图标模式），折叠状态存储在 user preferences 中。

### Header

顶栏组件包含：

- **标题面包屑**：显示当前 Tab 名称和子 Tab 路径层级，由 `showBreadcrumb` 偏好控制显隐
- **全局操作区**：通知铃铛、搜索快捷键入口、用户头像下拉菜单（个人信息 / 偏好设置 / 登出）
- **时间显示**：当前日期和时间（国际化格式）

## 三个全屏沉浸式页面

### DashboardModel（settingsGroup）

3D 场景配置工具。界面分为左侧场景树面板、中央 3D 渲染区域、右侧属性面板。支持以下编辑功能：

- 热点标记放置（`placeLabel` 模式）
- 标签文字编辑
- 场景配置（环境光、相机预设、背景色）
- 模型文件选择与可见性切换
- 剪切预览模式（`clipPreview`）— 用于查看模型剖面

### WorkflowCanvas（workflowCanvas）

工作流可视编辑画布。基于 React Flow 库，支持：

- 节点拖拽添加与删除
- 节点间连线（handles 输入/输出端口）
- 工作流参数配置（侧边面板）
- 保存 / 发布工作流定义

### LogViewer（logViewer）

工作流执行日志查看器。功能包括：

- 按时间范围过滤日志
- 按日志级别（info / warn / error）过滤
- 日志全文搜索
- 自动滚动（新日志到达时）
- 日志导出（复制 / 下载）

## 用户偏好系统

偏好设置分三层合并覆盖：

```typescript
const effectivePrefs = {
  ...DEFAULT_PREFERENCES, // 内置默认值（硬编码）
  ...userPrefs, // 数据库持久化偏好（GET /api/auth/me/state 获取）
  ...preferencesOverride, // 本地会话覆盖（未保存到数据库的临时变更）
};
```

### 配置项清单

| 配置项              | 类型                              | 默认值          | 说明           |
| ------------------- | --------------------------------- | --------------- | -------------- |
| theme               | `"system"` / `"light"` / `"dark"` | `"system"`      | 主题模式       |
| language            | `"zh-CN"` / `"en-US"`             | `"zh-CN"`       | 界面语言       |
| density             | `"comfortable"` / `"compact"`     | `"comfortable"` | 布局密度       |
| fontSize            | `"normal"` / `"large"`            | `"normal"`      | 字体大小       |
| desktopNotification | `boolean`                         | `false`         | 桌面通知开关   |
| alertSound          | `boolean`                         | `false`         | 告警声音开关   |
| showBreadcrumb      | `boolean`                         | `true`          | 面包屑显隐     |
| sidebarCollapsed    | `boolean`                         | `false`         | 侧边栏折叠状态 |

## SSE 集成

Admin 前端通过 `SseProvider` 组件集成 Server-Sent Events，实现实时数据推送。

### SseProvider

`SseProvider` 在 `App.tsx` 中作为顶层组件包裹主界面，管理 SSE 连接的完整生命周期：

- **连接建立**：认证成功后自动发起 `/api/events` 连接
- **心跳维持**：后端每隔 30 秒发送一次 `ping` 事件，超过 90 秒未收到心跳触发重连
- **自动重连**：指数退避策略（1s / 2s / 4s / 8s / 16s，上限 30s）
- **事件分发**：按事件类型分发到对应 handler，当前处理的事件类型包括：

| 事件类型      | 说明             | 更新目标                |
| ------------- | ---------------- | ----------------------- |
| `lighting`    | 照明设备状态变更 | 照明显示面板            |
| `alert`       | 新告警事件       | 告警通知列表 + 桌面通知 |
| `maintenance` | 维护任务状态变更 | 维护看板                |
| `energy`      | 能耗读数更新     | 能耗图表自动刷新        |
| `fault`       | 故障记录变更     | 故障列表                |

### sseStore

`sseStore` 是 SSE 连接状态管理的 Zustand store，提供连接生命周期的钩子方法和事件分发注册接口：

```typescript
interface SSEState {
  status: "disconnected" | "connecting" | "connected";
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  onMessage: (event: string, handler: (data: unknown) => void) => void;
}
```

## 其他 Store

### modelEditorStore

3D 场景编辑器的状态管理，位于 `apps/admin/src/store/modelEditorStore.ts`：

```typescript
interface ModelEditorState {
  config: DashboardModelConfig | null; // 当前编辑的场景配置
  labels: DashboardModelLabel[]; // 标签列表
  mode: "select" | "placeLabel" | "clipPreview"; // 编辑模式
  selectedLabelId: string | null; // 当前选中的标签
  modelFileVisible: boolean; // 模型文件可见性
  // 操作方法
  loadConfig: (id: string) => Promise<void>;
  addLabel: (label: DashboardModelLabel) => void;
  updateLabel: (id: string, changes: Partial<DashboardModelLabel>) => void;
  deleteLabel: (id: string) => void;
  setMode: (mode: ModelEditorState["mode"]) => void;
}
```

### useStore

全局通用状态 store，位于 `apps/admin/src/store/`，管理 FOUC（闪白）状态和应用级标志：

```typescript
interface AppFlags {
  themeLoaded: boolean; // 主题样式已加载
  userLoaded: boolean; // 用户数据已加载
}
```
