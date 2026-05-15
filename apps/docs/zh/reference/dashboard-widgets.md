# 仪表盘组件

公共 web 门户（`apps/web`）渲染一个由可拖拽组件组成的可定制仪表盘。组件配置存储在 PostgreSQL 中，由前端在加载时获取。

## 组件类型

| 组件         | 说明                               | 数据源                                             |
| ------------ | ---------------------------------- | -------------------------------------------------- |
| **统计卡片** | 带趋势指示器的大型数字 KPI。       | `dashboard_stats` 或 `iot` 点位值。                |
| **图表**     | 折线图、柱状图或饼图。             | `energy_readings`、`fault_stats` 或自定义查询。    |
| **列表**     | 可滚动项目列表（告警、维护任务）。 | `alerts`、`maintenance_reminders`。                |
| **天气**     | 当前天气卡片，含温度、湿度和图标。 | OpenWeatherMap API（需要 `OPENWEATHER_API_KEY`）。 |
| **能耗图表** | 专门的多系列能耗图表。             | `energy_readings` + `energy_areas`。               |

## 数据模型

### `dashboard_widgets`

| 列          | 类型    | 说明                                                                       |
| ----------- | ------- | -------------------------------------------------------------------------- |
| `id`        | uuid PK |                                                                            |
| `name`      | varchar | 仪表盘上显示的组件标签。                                                   |
| `type`      | varchar | 组件类型标识（`stat-card`、`chart`、`list`、`weather`、`energy-charts`）。 |
| `layoutX`   | integer | 网格列起始位置（从 0 开始）。                                              |
| `layoutY`   | integer | 网格行起始位置（从 0 开始）。                                              |
| `layoutW`   | integer | 网格列宽度。                                                               |
| `layoutH`   | integer | 网格行高度。                                                               |
| `dataType`  | varchar | 来源类别（`stats`、`iot`、`energy`、`alerts`、`weather`）。                |
| `dataJson`  | jsonb   | 组件专属配置（颜色、筛选条件、点位码）。                                   |
| `enabled`   | boolean | 是否渲染。                                                                 |
| `hidden`    | boolean | 是否从默认视图隐藏（用户可取消隐藏）。                                     |
| `sortOrder` | integer | 同网格位置内的显示顺序。                                                   |

### `dashboard_stats`

> **注意**：此表为完整性而记录 — 当前 schema 将统计卡片数据直接存储在 `dashboard_widgets.dataJson` 中，或在查询时动态计算。目前尚无独立的 `dashboard_stats` 表。

如未来添加，将用于跟踪：

| 列           | 类型        | 说明                                |
| ------------ | ----------- | ----------------------------------- |
| `id`         | uuid PK     |                                     |
| `key`        | varchar     | 指标标识符（例如 `total_energy`）。 |
| `value`      | real        | 当前值。                            |
| `unit`       | varchar     | 显示单位（例如 `kWh`、`%`）。       |
| `trend`      | real        | 与上一周期相比的百分比变化。        |
| `trendType`  | varchar     | `up`、`down`、`flat`。              |
| `snapshotAt` | timestamptz | 快照时间。                          |

## 布局系统

仪表盘使用 12 列 CSS Grid。每个组件通过 `layoutX/Y/W/H` 声明其位置和大小。网格是响应式的：在移动设备上，组件按 `sortOrder` 垂直堆叠。

## 天气组件

天气组件特殊，因为它调用外部 API：

- 需要在服务器 `.env.local` 中配置 `OPENWEATHER_API_KEY`。
- 默认位置为北京（`39.9042, 116.4074`），可通过 `WEATHER_LAT`、`WEATHER_LNG` 和 `WEATHER_LOCATION` 覆盖。
- 如果缺少 API 密钥，组件会自动在仪表盘上隐藏。
- 数据缓存 10 分钟以避免触发速率限制。

## Admin 配置

管理员通过 admin 后台的**仪表盘模型**页面配置组件：

1. 从类型面板添加组件。
2. 拖拽调整位置和大小。
3. 在属性面板配置数据绑定。
4. 保存布局到 `dashboard_widgets` 表。

更改在公共门户下次页面加载时立即生效。

## 公共 API

| 方法 | 路径                      | 说明                                   |
| ---- | ------------------------- | -------------------------------------- |
| GET  | `/api/public/dashboard`   | 完整仪表盘载荷（组件 + 统计 + 告警）。 |
| GET  | `/api/dashboard/settings` | 每用户仪表盘偏好。                     |
| PUT  | `/api/dashboard/settings` | 更新偏好。                             |

`GET /api/public/dashboard` 是公开的——无需认证。它是 web 门户主页的主要数据源。
