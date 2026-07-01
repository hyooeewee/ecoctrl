---
title: 照明控制系统
description: 照明路由、LightingSheet 前端组件、IoT 点位读写、Mock 降级策略、SSE 实时推送
---

# 照明控制系统

照明控制系统提供对照明组状态的查询与控制能力。用户通过 3D 场景点击区域标签，打开 LightingSheet 侧边面板进行开关操作。后端优先通过 IoT 服务读写物理点位，在 IoT 离线时以内存 Mock 模式降级运行。

## 整体架构

```
3D 场景中点击区域标签
    │
    ▼
LightingSheet 面板（前端组件）
    │ 查询/切换/批量操作
    ▼
routes/lighting.ts（后端路由）
    ├── IoT 在线 → 读写 IoT 点位（readPointValues / writePointValues）
    └── IoT 离线 → Mock GroupStore 内存模拟
    │
    ▼
SSE lighting_update 事件 → 所有连接的浏览器实时同步
```

## 照明状态模型

每个照明分组有三种状态：

| 状态   | 含义                             |
| ------ | -------------------------------- |
| `on`   | 组内所有灯具全部开启             |
| `off`  | 组内所有灯具全部关闭             |
| `half` | 部分开启（组内有开有关混合状态） |

## API 端点

| 方法 | 路径                                    | 说明                       |
| ---- | --------------------------------------- | -------------------------- |
| GET  | `/api/control/lighting/:labelId/status` | 查询某区域的照明组状态列表 |
| POST | `/api/control/lighting/:labelId/toggle` | 切换某照明组的状态         |
| POST | `/api/control/lighting/:labelId/batch`  | 批量全部打开或全部关闭     |

### 查询状态

`GET /api/control/lighting/:labelId/status` 返回：

```json
{
  "labelId": "area_1",
  "groups": [
    { "id": "g1", "name": "主照明", "status": "on" },
    { "id": "g2", "name": "氛围灯", "status": "half" },
    { "id": "g3", "name": "应急照明", "status": "off" }
  ]
}
```

### 切换与批量控制

- `toggle`：单个照明组在 `on` ↔ `off` 之间切换（如果当前是 `half`，先切换到 `on`）
- `batch`：支持全部打开（`action: "on"`）或全部关闭（`action: "off"`）

后端更新状态后，通过 SSE 广播 `lighting_update` 事件通知所有连接的浏览器同步。

## 前端的集成

### LightingSheet 组件

`apps/web/app/components/dashboard/lighting-sheet.tsx`：

- 320px 宽侧边面板
- 区域选择器下拉框（label 列表）
- 每组显示 light-bulb 图标（`on` / `half` / `off` 三种视觉样式）
- 点击灯泡图标切换状态
- 支持批量操作按钮
- 乐观更新模式：先更新 UI，服务端确认失败后回滚

### Zustand Store

照明状态使用 Zustand 管理（`store/lighting.ts`）：

```typescript
interface LightingStore {
  groupsByLabel: Record<string, LightingGroup[]>;

  initGroups: (labelId: string, groups: LightingGroup[]) => void;
  updateGroup: (labelId: string, groupId: string, status: LightStatus) => void;
  mergeGroups: (labelId: string, groups: LightingGroup[]) => void;
}
```

| 方法          | 说明                         |
| ------------- | ---------------------------- |
| `initGroups`  | 首次加载区域照明组数据       |
| `updateGroup` | 更新单个组状态（操作后调用） |
| `mergeGroups` | 合并 SSE 推送的批量状态更新  |

## Mock 降级策略

当 IoT 服务不可用时（网络故障、网关离线），`mockGroupStore` 提供内存级状态模拟：

- 从 `dashboard_models` 的 label 配置中推断照明分组
- 状态保存在内存 Map 中（keyed by point ID）
- 支持完整的查询、切换、批量操作

### Mock 状态聚合规则

`getMockStatus(labelId)` 聚合每个分组下的点位状态：

| 点位状态集合       | 聚合结果 |
| ------------------ | -------- |
| 全部 `on`          | `on`     |
| 全部 `off`         | `off`    |
| 混合 `on` 和 `off` | `half`   |

Mock 模式对所有 API 调用方透明 — 前端不需要感知 IoT 是否在线。

## SSE 更新

照明状态变更通过 SSE Manager 广播 `lighting_update` 事件：

```json
{
  "type": "lighting_update",
  "data": {
    "labelId": "area_1",
    "groups": [{ "id": "g1", "name": "主照明", "status": "off" }]
  }
}
```

前端通过 `mergeGroups` 方法自动合并新状态到 Zustand store，触发 UI 重新渲染。

## 相关文件

- `packages/server/src/routes/lighting.ts` — 照明控制路由
- `apps/web/app/components/dashboard/lighting-sheet.tsx` — 前端 LightingSheet 组件
- `apps/web/store/lighting.ts` — 照明状态 Zustand store
- `packages/server/src/services/iot/mockGroupStore.ts` — Mock 降级存储
