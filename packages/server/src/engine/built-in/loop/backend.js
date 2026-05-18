module.exports = async function execute(ctx, api) {
  const mode = String(ctx.config.mode || "foreach");
  const maxIterations = Number(ctx.config.maxIterations || 100);

  if (mode === "foreach") {
    const items = ctx.config.items || [];
    const itemVar = String(ctx.config.itemVar || "item");
    const results = [];
    for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
      api.variables.set(itemVar, items[i]);
      api.variables.set("index", i);
      if (ctx.config.body && ctx.config.body.nodes && ctx.config.body.edges) {
        const subResult = await api.workflow.executeSubGraph(
          ctx.config.body.nodes,
          ctx.config.body.edges,
        );
        results.push(subResult);
      }
    }
    return { iterations: Math.min(items.length, maxIterations), results };
  } else if (mode === "while") {
    let iterations = 0;
    const results = [];
    while (
      iterations < maxIterations &&
      api.expr.evaluateBoolean(String(ctx.config.condition || "false"))
    ) {
      if (ctx.config.body && ctx.config.body.nodes && ctx.config.body.edges) {
        const subResult = await api.workflow.executeSubGraph(
          ctx.config.body.nodes,
          ctx.config.body.edges,
        );
        results.push(subResult);
      }
      iterations++;
    }
    return { iterations, results };
  }

  return { iterations: 0, results: [] };
};
