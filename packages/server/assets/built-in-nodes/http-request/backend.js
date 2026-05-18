module.exports = async function execute(ctx, api) {
  const method = String(ctx.config.method || "GET").toLowerCase();
  const url = String(ctx.config.url || "");
  const headers = ctx.config.headers || {};
  const body = ctx.config.body;
  const timeoutMs = Math.min(Number(ctx.config.timeoutMs || 10000), 30000);

  const response = await api.http[method](url, { headers, body, timeout: timeoutMs });
  return {
    statusCode: response.status,
    body: response.json(),
    responseBody: response.body,
  };
};
