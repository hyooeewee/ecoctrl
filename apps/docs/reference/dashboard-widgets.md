# Dashboard Widgets

The public web portal (`apps/web`) renders a customizable dashboard composed of drag-and-drop widgets. Widget configuration is stored in PostgreSQL and fetched by the frontend on load.

## Widget types

| Widget            | Description                                               | Data source                                          |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| **Stat card**     | Large numeric KPI with trend indicator.                   | `dashboard_stats` or `iot` point values.             |
| **Chart**         | Line, bar or pie chart.                                   | `energy_readings`, `fault_stats`, or custom queries. |
| **List**          | Scrollable list of items (alerts, maintenance tasks).     | `alerts`, `maintenance_reminders`.                   |
| **Weather**       | Current weather card with temperature, humidity and icon. | OpenWeatherMap API (requires `OPENWEATHER_API_KEY`). |
| **Energy charts** | Specialized multi-series energy consumption chart.        | `energy_readings` + `energy_areas`.                  |

## Data model

### `dashboard_widgets`

| Column      | Type    | Notes                                                                              |
| ----------- | ------- | ---------------------------------------------------------------------------------- |
| `id`        | uuid PK |                                                                                    |
| `name`      | varchar | Widget label shown on the dashboard.                                               |
| `type`      | varchar | Widget type identifier (`stat-card`, `chart`, `list`, `weather`, `energy-charts`). |
| `layoutX`   | integer | Grid column start (0-based).                                                       |
| `layoutY`   | integer | Grid row start (0-based).                                                          |
| `layoutW`   | integer | Width in grid columns.                                                             |
| `layoutH`   | integer | Height in grid rows.                                                               |
| `dataType`  | varchar | Source category (`stats`, `iot`, `energy`, `alerts`, `weather`).                   |
| `dataJson`  | jsonb   | Widget-specific configuration (colors, filters, point codes).                      |
| `enabled`   | boolean | Whether the widget is rendered.                                                    |
| `hidden`    | boolean | Whether the widget is hidden from the default view (user can unhide).              |
| `sortOrder` | integer | Display order within the same grid position.                                       |

### `dashboard_stats`

> **Note**: This table is documented for completeness — the current schema stores stat card data directly in `dashboard_widgets.dataJson` or computes it at query time. There is no standalone `dashboard_stats` table yet.

If added in the future, it would track:

| Column       | Type        | Notes                                    |
| ------------ | ----------- | ---------------------------------------- |
| `id`         | uuid PK     |                                          |
| `key`        | varchar     | Metric identifier (e.g. `total_energy`). |
| `value`      | real        | Current value.                           |
| `unit`       | varchar     | Display unit (e.g. `kWh`, `%`).          |
| `trend`      | real        | Percentage change vs previous period.    |
| `trendType`  | varchar     | `up`, `down`, `flat`.                    |
| `snapshotAt` | timestamptz | When this snapshot was taken.            |

## Layout system

The dashboard uses a CSS Grid with 12 columns. Each widget declares its position and size via `layoutX/Y/W/H`. The grid is responsive: on mobile devices widgets stack vertically in their `sortOrder`.

## Weather widget

The weather widget is special because it calls an external API:

- Requires `OPENWEATHER_API_KEY` in the server's `.env.local`.
- Location defaults to Beijing (`39.9042, 116.4074`) unless overridden by `WEATHER_LAT`, `WEATHER_LNG` and `WEATHER_LOCATION`.
- If the API key is missing, the widget is automatically hidden on the dashboard.
- Data is cached for 10 minutes to avoid rate-limiting.

## Admin configuration

Administrators configure widgets through the **Dashboard Model** page in the admin panel:

1. Add widgets from a type palette.
2. Drag to reposition and resize.
3. Configure data binding in the properties panel.
4. Save layout to `dashboard_widgets` table.

Changes take effect immediately on the next page load of the public portal.

## Public API

| Method | Path                      | Description                                        |
| ------ | ------------------------- | -------------------------------------------------- |
| GET    | `/api/public/dashboard`   | Full dashboard payload (widgets + stats + alerts). |
| GET    | `/api/dashboard/settings` | Per-user dashboard preferences.                    |
| PUT    | `/api/dashboard/settings` | Update preferences.                                |

`GET /api/public/dashboard` is public — no authentication required. It is the primary data source for the web portal's home page.
