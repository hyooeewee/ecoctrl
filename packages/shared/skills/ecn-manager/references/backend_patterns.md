# Backend.js Patterns

## Pattern 1: Read IoT point and return value

```javascript
module.exports = async function (ctx, api) {
  const temp = await api.iot.readPoint("room-temp");
  return { temperature: temp, unit: "°C" };
};
```

## Pattern 2: HTTP API call

```javascript
module.exports = async function (ctx, api) {
  const res = await api.http.post("https://api.example.com/webhook", {
    headers: { "Content-Type": "application/json" },
    body: { event: "alarm", source: api.context.nodeName },
    timeout: 5000,
  });
  return { status: res.status, body: res.json() };
};
```

## Pattern 3: Database query

```javascript
module.exports = async function (ctx, api) {
  const result = await api.db.execute("select", "alert_logs", {
    severity: "error",
    resolved: false,
  });
  return { alerts: result.rows, count: result.count };
};
```

## Pattern 4: Conditional branching (for condition nodes)

```javascript
module.exports = async function (ctx, api) {
  const value = await api.iot.readPoint("pressure");
  const threshold = ctx.config.threshold || 100;
  return { result: value > threshold };
};
```

## Pattern 5: Set workflow variable for downstream nodes

```javascript
module.exports = async function (ctx, api) {
  const data = await api.http.get("https://api.example.com/status");
  api.variables.set("api_status", data.json());
  return { fetched: true };
};
```

## Pattern 6: Send notification

```javascript
module.exports = async function (ctx, api) {
  await api.notify.send({
    title: "Workflow Alert",
    content: `Node ${api.context.nodeName} executed`,
    level: "info",
  });
  return { notified: true };
};
```

## Pattern 7: Error handling

```javascript
module.exports = async function (ctx, api) {
  try {
    const value = await api.iot.readPoint("sensor-01");
    return { value };
  } catch (err) {
    api.log.error("Failed to read sensor", { error: err.message });
    // Return an error object so the workflow can handle it
    return { error: err.message, value: null };
  }
};
```
