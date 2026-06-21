module.exports = async function execute(ctx, api) {
  const mode = String(ctx.config.mode || "foreach");
  const maxIterations = Number(ctx.config.maxIterations || 100);
  api.log.info(`[loop] mode=${mode}, maxIterations=${maxIterations}`);

  if (mode === "foreach") {
    let items = ctx.config.items;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        api.log.error(`[loop] foreach items is not a valid array or JSON string: "${items}"`);
        throw new Error(
          `loop foreach mode requires 'items' to be an array or a JSON array string, got: "${items}"`,
        );
      }
    }
    if (!Array.isArray(items)) {
      api.log.error(`[loop] foreach items is not an array after resolution: type=${typeof items}`);
      throw new Error(`loop foreach mode requires 'items' to be an array, got: ${typeof items}`);
    }

    if (items.length === 0) {
      api.log.warn("[loop] foreach items is empty, no iterations will run");
      return { input: { mode, maxIterations }, raw: { iterations: 0, results: [] } };
    }

    const itemVar = String(ctx.config.itemVar || "item");
    const iterations = Math.min(items.length, maxIterations);
    api.log.info(`[loop] foreach: ${iterations} iterations (items=${items.length})`);

    const results = [];
    for (let i = 0; i < iterations; i++) {
      api.log.info(
        `[loop] foreach iteration ${i + 1}/${iterations}, ${itemVar}=${JSON.stringify(items[i])}`,
      );
      api.variables.set(itemVar, items[i]);
      api.variables.set("index", i);
      if (ctx.config.body && ctx.config.body.nodes && ctx.config.body.edges) {
        try {
          const subResult = await api.workflow.executeSubGraph(
            ctx.config.body.nodes,
            ctx.config.body.edges,
          );
          results.push(subResult);
        } catch (err) {
          api.log.error(`[loop] foreach iteration ${i + 1} failed: ${err.message}`);
          throw new Error(`foreach 迭代第 ${i + 1} 次失败: ${err.message}`, { cause: err });
        }
      }
    }
    api.log.info(`[loop] foreach completed: ${results.length} iterations succeeded`);
    return {
      input: { mode, maxIterations, items, itemVar },
      raw: { iterations: results.length, results },
    };
  }

  if (mode === "while") {
    const conditionStr = String(ctx.config.condition || "false");
    api.log.info(`[loop] while mode: condition="${conditionStr}"`);

    let iterations = 0;
    const results = [];
    while (iterations < maxIterations) {
      let shouldContinue;
      try {
        shouldContinue = api.expr.evaluateBoolean(conditionStr);
      } catch (err) {
        api.log.error(`[loop] while condition evaluation failed: ${err.message}`);
        throw new Error(`while 条件表达式求值失败: ${err.message}`, { cause: err });
      }
      if (!shouldContinue) {
        api.log.info(`[loop] while condition became false after ${iterations} iterations`);
        break;
      }

      api.log.info(`[loop] while iteration ${iterations + 1}/${maxIterations}`);
      if (ctx.config.body && ctx.config.body.nodes && ctx.config.body.edges) {
        try {
          const subResult = await api.workflow.executeSubGraph(
            ctx.config.body.nodes,
            ctx.config.body.edges,
          );
          results.push(subResult);
        } catch (err) {
          api.log.error(`[loop] while iteration ${iterations + 1} failed: ${err.message}`);
          throw new Error(`while 迭代第 ${iterations + 1} 次失败: ${err.message}`, { cause: err });
        }
      }
      iterations++;
    }
    api.log.info(`[loop] while completed: ${iterations} iterations`);
    return {
      input: { mode, maxIterations, condition: conditionStr },
      raw: { iterations, results },
    };
  }

  api.log.error(`[loop] unknown mode: ${mode}`);
  throw new Error(`loop node unknown mode: ${mode}. Expected "foreach" or "while".`);
};
