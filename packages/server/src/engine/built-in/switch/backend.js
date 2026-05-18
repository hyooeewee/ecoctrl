module.exports = async function execute(ctx, api) {
  const value = api.expr.evaluateExpression(String(ctx.config.expression || ""));
  const cases = ctx.config.cases || [];
  for (const c of cases) {
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
    }
    if (match) {
      return { value, matched: c.value };
    }
  }
  return { value, matched: "default" };
};
