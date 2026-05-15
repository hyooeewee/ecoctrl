# IoT Integration

EcoCtrl acts as a transparent proxy to an upstream IoT gateway. The frontends never talk to the gateway directly; all requests flow through the EcoCtrl API, which handles authentication, token refresh, and request/response translation.

## Architecture

```
Browser (apps/web or apps/admin)
        │
        ▼
   EcoCtrl API  /api/iot/*
        │
        ▼
   Token refresh service
        │
        ▼
   Upstream IoT gateway
```

## Token management

The IoT gateway issues short-lived access tokens. EcoCtrl caches them in the single-row `iot_tokens` table:

| Column         | Type      | Notes                                       |
| -------------- | --------- | ------------------------------------------- |
| `id`           | serial PK |                                             |
| `accessToken`  | text      | Current bearer token from the gateway.      |
| `refreshToken` | text      | Long-lived refresh token.                   |
| `expiresAt`    | bigint    | Absolute expiry as Unix epoch milliseconds. |

Before every outbound request, the service layer checks `expiresAt`. If the token is within 5 minutes of expiry (or already expired), it calls the gateway's refresh endpoint, persists the new pair, and then proceeds with the original request. This happens transparently — callers never see a 401 from the gateway.

## Object metadata

Physical devices and data points are represented as `objects` in EcoCtrl:

| Column        | Type    | Notes                                                  |
| ------------- | ------- | ------------------------------------------------------ |
| `id`          | uuid PK |                                                        |
| `code`        | varchar | Unique identifier from the upstream gateway.           |
| `name`        | varchar | Human-readable label.                                  |
| `type`        | varchar | Category (sensor, actuator, meter, etc.).              |
| `description` | text    | Optional.                                              |
| `metadata`    | jsonb   | Free-form upstream properties (unit, range, protocol). |

Objects can be created manually in the admin dashboard or synced in bulk from the gateway.

## API routes

All routes under `/api/iot/*` require a valid JWT (they are not public).

| Method | Path                   | Description                                             |
| ------ | ---------------------- | ------------------------------------------------------- |
| GET    | `/iot/token`           | Returns the cached access token (useful for debugging). |
| POST   | `/iot/codes/values`    | Read current point values for one or more object codes. |
| POST   | `/iot/codes/history`   | Historical values for a point within a time range.      |
| POST   | `/iot/codes/set`       | Write a value back to a writable point.                 |
| POST   | `/iot/codes/force-set` | Force-write, bypassing validation.                      |
| POST   | `/iot/alarms`          | Alarm history from the gateway.                         |
| POST   | `/iot/alarm-configs`   | Alarm threshold configuration.                          |

Request and response shapes match the upstream gateway's contract. EcoCtrl forwards the body verbatim and returns the gateway's response unchanged (minus any credential headers).

## Environment variables

| Variable   | Required | Description                                       |
| ---------- | -------- | ------------------------------------------------- |
| `BASE_URL` | yes      | Upstream IoT gateway base URL.                    |
| `APP_ID`   | yes      | Gateway application ID used during token refresh. |

Both are read from `packages/server/.env.local` and forwarded to the IoT service layer.

## Web portal integration

`apps/web` displays real-time IoT data on the dashboard. The widget system (`dashboard-widgets`) can bind to IoT point values via the `dataType` field. When a widget's `dataType` is set to `iot`, the frontend polls `/api/iot/codes/values` periodically and renders the latest readings.
