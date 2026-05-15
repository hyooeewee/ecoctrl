# 报表系统

EcoCtrl 的报表系统允许管理员定义定时报表计划，并从模板生成文档。报表生成通过队列系统异步运行，因此大型导出不会阻塞 API。

## 概念

| 术语         | 说明                                                     |
| ------------ | -------------------------------------------------------- |
| **报表计划** | 一个定时任务，定义收集哪些数据、如何格式化以及何时运行。 |
| **报表模板** | 可复用的文档布局（例如 PDF 页眉、页脚、图表位置）。      |
| **报表实例** | 执行计划产生的单个生成文档。                             |

## 数据模型

### `report_plans`

| 列            | 类型        | 说明                                               |
| ------------- | ----------- | -------------------------------------------------- |
| `id`          | uuid PK     |                                                    |
| `name`        | varchar     | 计划名称。                                         |
| `description` | text        | 可选。                                             |
| `templateId`  | uuid FK     | → report_templates(id)。                           |
| `schedule`    | varchar     | Cron 表达式或 `manual`。                           |
| `config`      | jsonb       | 数据源、筛选条件、格式（`pdf` / `csv` / `xlsx`）。 |
| `enabled`     | boolean     | 计划是否激活。                                     |
| `lastRunAt`   | timestamptz | 可为空。                                           |
| `createdAt`   | timestamptz |                                                    |

### `report_templates`

| 列            | 类型        | 说明                               |
| ------------- | ----------- | ---------------------------------- |
| `id`          | uuid PK     |                                    |
| `name`        | varchar     | 模板名称。                         |
| `description` | text        | 可选。                             |
| `content`     | jsonb       | 布局定义（页眉、章节、图表配置）。 |
| `createdAt`   | timestamptz |                                    |

## Admin UI

admin 后台的**报表**页面提供：

- 现有报表计划列表，含状态、上次运行时间和下次定时运行时间。
- 计划的增删改查操作。
- 模板库，展示可用布局。
- 任何计划的立即执行触发器（通过队列立即运行）。
- 已生成报表实例的下载链接。

## API

| 方法   | 路径                         | 说明         |
| ------ | ---------------------------- | ------------ |
| GET    | `/api/reports/plans`         | 列出报表计划 |
| POST   | `/api/reports/plans`         | 创建计划     |
| GET    | `/api/reports/plans/:id`     | 获取计划详情 |
| PUT    | `/api/reports/plans/:id`     | 更新计划     |
| DELETE | `/api/reports/plans/:id`     | 删除计划     |
| POST   | `/api/reports/plans/:id/run` | 手动执行计划 |
| GET    | `/api/reports/templates`     | 列出模板     |

## 执行流程

```
定时触发（或手动触发）
    │
    ▼
队列任务：report-generation
    │
    ▼
Worker 从配置的数据源收集数据
    │
    ▼
应用模板布局
    │
    ▼
渲染为目标格式（PDF / CSV / XLSX）
    │
    ▼
存储结果并更新 plan.lastRunAt
```

## 添加报表数据源

1. 在 `packages/server/src/services/reporting/` 中添加数据收集逻辑。
2. 在报表计划配置 schema 中注册数据源名称。
3. 更新 admin UI，允许在计划编辑器中选择新数据源。
4. Worker 在运行时会自动按名称识别并使用新数据源。
