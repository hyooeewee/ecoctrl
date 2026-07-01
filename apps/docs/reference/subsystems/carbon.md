---
title: 碳排放因子系统
description: 因子数据模型、分类树结构、国家排放因子数据库同步、与 Energy 模块联动
---

# 碳排放因子系统

碳排放因子系统将能耗数据转换为碳排放量。因子值定义了每单位能耗对应的碳排放量（如 `kgCO2/kWh`）。系统采用层次化的分类树结构存储因子，支持与国家温室气体排放因子数据库同步，并与 Energy 模块联动实现碳核算。

## 数据模型

系统包含两张核心表：`carbon_factor_nodes` 和 `carbon_factors`，分别存储分类树结构和具体的因子值。

### carbon_factor_nodes（分类树）

| 字段           | 类型      | 说明                                           |
| -------------- | --------- | ---------------------------------------------- |
| `id`           | serial PK | 主键                                           |
| `name`         | varchar   | 分类名称（如「电力」「天然气」「水」「热力」） |
| `parentId`     | int FK    | 父节点 ID，支持多级嵌套                        |
| `isExpandable` | boolean   | 是否有子节点（用于前端展开/折叠）              |

分类树示例：

```
排放因子
├── 电力
│   ├── 华东电网
│   ├── 华北电网
│   └── 可再生能源
├── 天然气
│   ├── 管道天然气
│   └── LNG
├── 水
│   ├── 自来水
│   └── 中水
└── 热力
    └── 集中供热
```

### carbon_factors（因子值）

| 字段            | 类型        | 说明                                         |
| --------------- | ----------- | -------------------------------------------- |
| `id`            | serial PK   | 主键                                         |
| `nodeId`        | int FK      | 所属分类节点 ID                              |
| `name`          | varchar     | 因子名称（如「华东电网电力排放因子」）       |
| `value`         | numeric     | 因子数值（如 0.7035）                        |
| `unit`          | varchar     | 单位（如 `kgCO2/kWh`、`tCO2/万m3`）          |
| `source`        | text        | 数据来源说明（如「国家发改委 2024 年数据」） |
| `effectiveYear` | int         | 生效年份                                     |
| `createdAt`     | timestamptz | 创建时间                                     |
| `updatedAt`     | timestamptz | 更新时间                                     |

## 与国家数据库同步

系统可连接到国家温室气体排放因子数据库进行增量同步：

```
1. 定时任务（每日）触发同步
2. 请求国家数据库 API，获取增量更新
3. 新增因子 → 自动插入分类树和因子表
4. 已有因子 → 覆盖更新（保留版本记录）
5. 同步完成后触发事件 → 重新计算引用该因子的历史碳排放
```

### 同步策略

| 变更类型 | 处理方式                                |
| -------- | --------------------------------------- |
| 新增因子 | 自动插入对应的分类节点和因子记录        |
| 值变更   | 覆盖更新，保留 `source` 变更记录        |
| 废弃因子 | 标记为 `deprecated`，不影响已有历史数据 |

同步完成后，所有引用已变更因子的历史碳排放数据自动进入重新计算队列（通过 pg-boss 异步处理）。

## 与 Energy 模块联动

碳排放因子系统与 Energy（能耗）模块紧密集成，实现从能耗到碳排放的自动转换：

```
能耗数据（energy_readings）
  - areaId（区域 ID）
  - energyType（能源类型：electricity/gas/water/heat）
  - value（能耗值）
  - unit（能耗单位）
        │
        ▼
  通过 energyType 匹配碳因子分类树
  查找对应区域的最新有效因子
        │
        ▼
  碳排放量 = 能耗值 × 碳排放因子
  结果写入 carbon_emissions 表
        │
        ▼
  仪表盘更新：
  - 管理总览碳排卡片
  - 碳排放趋势图（日/周/月/年）
  - 各区域碳排占比分析
```

### 碳排计算示例

```typescript
// 简化的碳排计算
function calculateCarbonEmission(energyValue: number, energyType: string, region: string): number {
  const factor = findFactor(energyType, region);
  return energyValue * factor.value;
}
```

## API 端点

| 方法 | 路径                       | 说明                                   |
| ---- | -------------------------- | -------------------------------------- |
| GET  | `/api/carbon-factors`      | 获取因子分类树（含因子值）             |
| PUT  | `/api/carbon-factors`      | 更新因子值（需管理员权限）             |
| GET  | `/api/carbon-factors/sync` | 触发与数据库的同步                     |
| GET  | `/api/carbon-emissions`    | 查询碳排放数据（支持按区域、时间筛选） |

## 相关文件

- `packages/server/src/schemas/carbonFactors.ts` — 因子值表定义
- `packages/server/src/schemas/carbonFactorNodes.ts` — 分类树表定义
- `packages/server/src/routes/carbon.ts` — 碳因子与排放 API 路由
- `packages/server/src/services/carbon/` — 碳计算服务
