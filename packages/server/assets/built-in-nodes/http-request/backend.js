module.exports = async function execute(ctx, api) {
  const method = String(ctx.config.method || "GET").toLowerCase();
  const url = String(ctx.config.url || "");
  const headers = ctx.config.headers || {};
  const timeoutMs = Math.min(Number(ctx.config.timeoutMs || 10000), 30000);

  const opts = { headers, timeout: timeoutMs };
  if (ctx.config.body != null) {
    opts.body = ctx.config.body;
  }

  const response = await api.http[method](url, opts);
  return {
    statusCode: response.status,
    body: response.json(),
    responseBody: response.body,
  };
};
