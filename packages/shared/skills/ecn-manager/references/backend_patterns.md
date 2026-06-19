# Backend.js Patterns

## Pattern 1: Read IoT point and return value

```javascript
module.exports = async function execute(ctx, api) {
  const temp = await api.iot.readPoint("room-temp");
  return { temperature: temp, unit: "°C" };
};
```

## Pattern 2: HTTP API call

```javascript
module.exports = async function execute(ctx, api) {
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
module.exports = async function execute(ctx, api) {
  const result = await api.db.execute("select", "alert_logs", {
    severity: "error",
    resolved: false,
  });
  return { alerts: result.rows, count: result.count };
};
```

## Pattern 4: Conditional branching (for condition nodes)

```javascript
module.exports = async function execute(ctx, api) {
  const value = await api.iot.readPoint("pressure");
  const threshold = ctx.config.threshold || 100;
  return { result: value > threshold };
};
```

## Pattern 5: Set workflow variable for downstream nodes

```javascript
module.exports = async function execute(ctx, api) {
  const data = await api.http.get("https://api.example.com/status");
  api.variables.set("api_status", data.json());
  return { fetched: true };
};
```

## Pattern 6: Send notification

```javascript
module.exports = async function execute(ctx, api) {
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
module.exports = async function execute(ctx, api) {
  try {
    const value = await api.iot.readPoint("sensor-01");
    return { value };
  } catch (err) {
    api.log.error("Failed to read sensor", { error: err.message });
    return { error: err.message, value: null };
  }
};
```

---

## Advanced Patterns (Built-in Node Quality)

### Pattern 8: Input validation with type coercion

Every built-in node validates and normalizes config before use. Always use `String()`, `Number()`, `Boolean()` to coerce types.

```javascript
module.exports = async function execute(ctx, api) {
  const pointName = String(ctx.config.pointName || "");
  const retry = Math.round(Number(ctx.config.retry || 0));
  const silent = Boolean(ctx.config.silent ?? false);

  if (!pointName) {
    api.log.error("[my_node] missing required field 'pointName'");
    throw new Error("my_node node requires 'pointName'");
  }
  // ...
};
```

### Pattern 9: Structured logging with node prefix

Every log line starts with `[node_id]` for traceability. Use template literals for key=value context.

```javascript
api.log.info(`[http_request] ${method.toUpperCase()} ${url} timeout=${timeoutMs}ms`);
api.log.error(`[point_read] failed to read point ${pointName}: ${err.message}`);
api.log.warn(`[delay] durationMs=${durationMs} exceeds max 300000ms, clamping`);
```

### Pattern 10: Try/catch with cause chaining

Always wrap I/O calls in try/catch. Re-throw with `{ cause: err }` and a Chinese user-facing message.

```javascript
try {
  values = await api.iot.readPoints([pointName]);
} catch (err) {
  api.log.error(`[point_read] failed to read point ${pointName}: ${err.message}`);
  throw new Error(`读取测点 ${pointName} 失败: ${err.message}`, { cause: err });
}
```

### Pattern 11: Enum validation

Validate enum fields before use, similar to http_request's method check.

```javascript
const validOperations = ["select", "insert", "update", "delete"];
if (!validOperations.includes(operation)) {
  api.log.error(`[database] invalid operation: ${operation}`);
  throw new Error(
    `database node invalid operation: "${operation}". Expected one of: ${validOperations.join(", ")}`,
  );
}
```

### Pattern 12: Numeric clamping

Clamp numeric config to safe bounds.

```javascript
const durationMs = Number(ctx.config.durationMs || 0);
if (durationMs > 300000) {
  api.log.warn(`[delay] durationMs=${durationMs} exceeds max 300000ms, clamping`);
}
const actualMs = Math.min(durationMs, 300000);
```

### Pattern 13: JSON payload parsing

Safely parse JSON strings from config, with fallback.

```javascript
let payload = ctx.config.payload ?? {};
if (typeof payload === "string") {
  const raw = payload.trim();
  if (!raw) {
    payload = {};
  } else {
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      api.log.warn(`[my_node] payload is not valid JSON: ${err.message}`);
      payload = { message: raw };
    }
  }
}
```

### Pattern 14: HTTP request with full validation

Complete HTTP request pattern with method validation, URL check, timeout clamping, and response parsing.

```javascript
module.exports = async function execute(ctx, api) {
  const method = String(ctx.config.method || "GET").toLowerCase();
  const url = String(ctx.config.url || "").trim();
  const headers = ctx.config.headers || {};
  const timeoutMs = Math.min(Number(ctx.config.timeoutMs || 10000), 30000);

  if (!url) {
    api.log.error("[http_request] missing required field 'url'");
    throw new Error("http_request node requires 'url'");
  }

  const validMethods = ["get", "post", "put", "patch", "delete"];
  if (!validMethods.includes(method)) {
    api.log.error(`[http_request] invalid method: ${method}`);
    throw new Error(`http_request node invalid method: "${method}"`);
  }

  const opts = { headers, timeout: timeoutMs };
  if (ctx.config.body != null) {
    opts.body = ctx.config.body;
  }

  api.log.info(`[http_request] ${method.toUpperCase()} ${url} timeout=${timeoutMs}ms`);

  let response;
  try {
    response = await api.http[method](url, opts);
  } catch (err) {
    api.log.error(`[http_request] ${method.toUpperCase()} ${url} failed: ${err.message}`);
    throw new Error(`HTTP 请求失败 (${method.toUpperCase()} ${url}): ${err.message}`, {
      cause: err,
    });
  }

  api.log.info(`[http_request] ${method.toUpperCase()} ${url} -> status=${response.status}`);

  let parsedBody;
  try {
    parsedBody = response.json();
  } catch {
    api.log.warn(`[http_request] Response body is not valid JSON, returning raw body`);
    parsedBody = response.body;
  }

  return { statusCode: response.status, body: parsedBody, responseBody: response.body };
};
```

### Pattern 15: Trigger node (skeleton)

Trigger nodes initiate a workflow. They typically read initial data and return it for downstream nodes.

```javascript
/**
 * My Trigger
 * Category: trigger
 */
module.exports = async function execute(ctx, api) {
  const intervalMs = Number(ctx.config.intervalMs || 60000);

  api.log.info(`[my_trigger] triggered, interval=${intervalMs}ms`);

  try {
    const data = await api.iot.readPoints(["sensor-01"]);
    return { triggered: true, data, timestamp: Date.now() };
  } catch (err) {
    api.log.error(`[my_trigger] failed to read initial data: ${err.message}`);
    throw new Error(`触发器读取数据失败: ${err.message}`, { cause: err });
  }
};
```

### Pattern 16: Condition node (boolean return)

Condition nodes must return `{ result: boolean }` for the workflow engine to branch correctly.

```javascript
/**
 * My Condition
 * Category: condition
 */
module.exports = async function execute(ctx, api) {
  const expression = String(ctx.config.expression || "false");
  api.log.info(`[my_condition] evaluating: ${expression}`);

  let result;
  try {
    result = api.expr.evaluateBoolean(expression);
  } catch (err) {
    api.log.error(`[my_condition] expression evaluation failed: "${expression}" -> ${err.message}`);
    throw new Error(`条件表达式求值失败: "${expression}" -> ${err.message}`, { cause: err });
  }

  api.log.info(`[my_condition] "${expression}" = ${result}`);
  return { result };
};
```

## Reference: Real Built-in Node Examples

For reference, see these well-implemented built-in nodes:

| Node           | Key Patterns                                               |
| -------------- | ---------------------------------------------------------- |
| `http_request` | Method enum validation, timeout clamping, response parsing |
| `point_read`   | Required field validation, IoT API, result extraction      |
| `point_write`  | Multiple required fields, write API, success confirmation  |
| `condition`    | Expression evaluation, boolean return                      |
| `database`     | Operation enum, table validation, dynamic API call         |
| `delay`        | Numeric clamping, sleep utility                            |
| `switch`       | Expression eval, case matching loop, operator enum         |
| `sse_send`     | JSON payload parsing, target mode branching                |
