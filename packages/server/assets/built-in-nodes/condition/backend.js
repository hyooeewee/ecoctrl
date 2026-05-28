module.exports = async function execute(ctx, api) {
  const expression = String(ctx.config.expression || "false");
  api.log.info(`[condition] evaluating: ${expression}`);

  let result;
  try {
    result = api.expr.evaluateBoolean(expression);
  } catch (err) {
    api.log.error(`[condition] expression evaluation failed: "${expression}" -> ${err.message}`);
    throw new Error(`condition 表达式求值失败: "${expression}" -> ${err.message}`, { cause: err });
  }

  api.log.info(`[condition] "${expression}" = ${result}`);
  return { result };
};
