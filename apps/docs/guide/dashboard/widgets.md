---
title: 仪表盘小组件参考
description: StatCard、EnergyTrendChart、EnergyBreakdownChart、Device/Alert/Suggestion/Weather 组件说明
---

# 仪表盘小组件参考

![仪表盘小组件](/screenshots/web-3d.png)

Web 门户的仪表盘由多种类型的小组件组成，每个组件展示不同维度的数据。

## StatCard（统计卡片）

核心 KPI 展示组件：

- 显示一个大号数值和单位
- 可选的 sparkline 迷你趋势图（显示最近一段时间的变化）
- 趋势方向指示 ↑ / ↓ / →
- 点击卡片弹出详情对话框，展示更细粒度的数据

## EnergyTrendChart（能耗趋势图）

支持三种图表类型：

| 类型      | 适用场景               |
| --------- | ---------------------- |
| 📈 面积图 | 展示能耗的累计变化趋势 |
| 📉 折线图 | 展示精确的数值变化曲线 |
| 📊 柱状图 | 按时间段对比能耗数据   |

数据源：`energy_readings` 表按时间范围聚合。

## EnergyBreakdownChart（能耗构成图）

饼图展示各分类能耗占比：

- ❄️ HVAC（暖通空调）
- 💡 照明
- ⚙️ 设备
- 🔌 其他

颜色编码与 Admin 后台一致，便于跨系统对照。

## 列表组件

| 组件           | 展示内容                                        |
| -------------- | ----------------------------------------------- |
| DeviceList     | 设备列表：名称、状态（在线/离线）、最近活动时间 |
| AlertList      | 告警列表：等级、设备、时间、状态图标            |
| SuggestionList | 优化建议：节能建议、运维提示                    |

每种列表均支持点击展开查看详情。

## WeatherWidget（天气组件）

展示当前位置的实时天气信息：

- 当前温度与天气图标
- 最高 / 最低温
- 湿度与风速

配置需求：`OPENWEATHER_API_KEY` 环境变量。未配置时该组件自动隐藏。

## 数据源绑定

每个小组件的 `dataType` 字段决定其数据来源：

| dataType  | 数据源                        | 更新方式        |
| --------- | ----------------------------- | --------------- |
| `stat`    | `dashboard_stats` 聚合        | REST + SSE 推送 |
| `chart`   | `energy_readings`             | REST + SSE 推送 |
| `list`    | `alerts` / `devices` / 自定义 | REST            |
| `weather` | OpenWeather API               | REST 定时轮询   |
| `iot`     | IoT 点位值                    | REST 定时轮询   |
