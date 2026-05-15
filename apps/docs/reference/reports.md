# Reports

EcoCtrl's reporting system lets administrators define scheduled report plans and generate documents from templates. Report generation runs asynchronously through the queue system so large exports never block the API.

## Concepts

| Term                | Description                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Report plan**     | A scheduled job that defines what data to collect, how to format it, and when to run. |
| **Report template** | A reusable document layout (e.g. PDF header, footer, chart placement).                |
| **Report instance** | A single generated document produced by executing a plan.                             |

## Data model

### `report_plans`

| Column        | Type        | Notes                                                  |
| ------------- | ----------- | ------------------------------------------------------ |
| `id`          | uuid PK     |                                                        |
| `name`        | varchar     | Human-readable plan name.                              |
| `description` | text        | Optional.                                              |
| `templateId`  | uuid FK     | → report_templates(id).                                |
| `schedule`    | varchar     | Cron expression or `manual`.                           |
| `config`      | jsonb       | Data source, filters, format (`pdf` / `csv` / `xlsx`). |
| `enabled`     | boolean     | Whether the plan is active.                            |
| `lastRunAt`   | timestamptz | Nullable.                                              |
| `createdAt`   | timestamptz |                                                        |

### `report_templates`

| Column        | Type        | Notes                                                 |
| ------------- | ----------- | ----------------------------------------------------- |
| `id`          | uuid PK     |                                                       |
| `name`        | varchar     | Template name.                                        |
| `description` | text        | Optional.                                             |
| `content`     | jsonb       | Layout definition (headers, sections, chart configs). |
| `createdAt`   | timestamptz |                                                       |

## Admin UI

The **Reports** page in the admin dashboard provides:

- A list of existing report plans with status, last run time and next scheduled run.
- CRUD operations on plans (create, edit, enable/disable, delete).
- A template gallery showing available layouts.
- Manual execution trigger for any plan (runs immediately via queue).
- Download links for generated report instances.

## API

| Method | Path                         | Description           |
| ------ | ---------------------------- | --------------------- |
| GET    | `/api/reports/plans`         | List report plans     |
| POST   | `/api/reports/plans`         | Create a plan         |
| GET    | `/api/reports/plans/:id`     | Get plan details      |
| PUT    | `/api/reports/plans/:id`     | Update plan           |
| DELETE | `/api/reports/plans/:id`     | Delete plan           |
| POST   | `/api/reports/plans/:id/run` | Execute plan manually |
| GET    | `/api/reports/templates`     | List templates        |

## Execution flow

```
Schedule fires (or manual trigger)
    │
    ▼
Queue job: report-generation
    │
    ▼
Worker collects data from configured sources
    │
    ▼
Applies template layout
    │
    ▼
Renders to target format (PDF / CSV / XLSX)
    │
    ▼
Stores result and updates plan.lastRunAt
```

## Adding a report data source

1. Add the data collection logic in `packages/server/src/services/reporting/`.
2. Register the source name in the report plan config schema.
3. Update the admin UI to allow selecting the new source in the plan editor.
4. The worker automatically picks up the new source by name at runtime.
