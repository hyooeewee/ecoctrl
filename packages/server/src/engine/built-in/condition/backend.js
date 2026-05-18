module.exports = async function execute(ctx, api) {
  const result = api.expr.evaluateBoolean(String(ctx.config.expression || "false"));
  return { result };
};
