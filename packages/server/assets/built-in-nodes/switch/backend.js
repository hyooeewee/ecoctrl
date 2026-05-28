module.exports = async function execute(ctx, api) {
  const expression = String(ctx.config.expression || "");
  api.log.info(`[switch] evaluating expression: ${expression || "(empty)"}`);

  let value;
  try {
    value = api.expr.evaluateExpression(expression);
  } catch (err) {
    api.log.error(`[switch] expression evaluation failed: "${expression}" -> ${err.message}`);
    throw new Error(`switch 表达式求值失败: "${expression}" -> ${err.message}`, { cause: err });
  }

  const cases = ctx.config.cases || [];
  api.log.info(`[switch] value=${JSON.stringify(value)}, cases=${cases.length}`);

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const op = c.operator || "===";
    let match = false;
    switch (op) {
      case "===":
      case "==":
        match = value == c.value;
        break;
      case "!=":
      case "!==":
        match = value != c.value;
        break;
      case ">":
        match = Number(value) > Number(c.value);
        break;
      case "<":
        match = Number(value) < Number(c.value);
        break;
      case ">=":
        match = Number(value) >= Number(c.value);
        break;
      case "<=":
        match = Number(value) <= Number(c.value);
        break;
      default:
        api.log.warn(`[switch] unknown operator "${op}" at case ${i}, skipping`);
        continue;
    }
    if (match) {
      api.log.info(`[switch] matched case ${i}: operator="${op}" value="${c.value}"`);
      return { value, matched: c.value, matchedIndex: i };
    }
  }

  api.log.info(`[switch] no case matched, returning default`);
  return { value, matched: "default", matchedIndex: -1 };
};
