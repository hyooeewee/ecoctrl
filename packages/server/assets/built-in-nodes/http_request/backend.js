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
    throw new Error(
      `http_request node invalid method: "${method}". Expected one of: GET, POST, PUT, PATCH, DELETE`,
    );
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

  return {
    statusCode: response.status,
    body: parsedBody,
    responseBody: response.body,
  };
};
