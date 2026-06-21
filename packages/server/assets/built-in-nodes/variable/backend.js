module.exports = async function execute(ctx, api) {
  // Support both legacy 'set' object and new 'name'/'value' pair
  let entries = [];

  if (ctx.config.set && typeof ctx.config.set === "object" && !Array.isArray(ctx.config.set)) {
    entries = Object.entries(ctx.config.set);
  } else if (ctx.config.name) {
    entries = [[String(ctx.config.name), ctx.config.value]];
  }

  if (entries.length === 0) {
    api.log.warn(
      "[variable] no variables to set (neither 'set' object nor 'name'/'value' provided)",
    );
    return {
      input: entries.length > 0 ? Object.fromEntries(entries) : {},
      raw: { vars: api.variables.all(), setCount: 0 },
    };
  }

  api.log.info(
    `[variable] setting ${entries.length} variable(s): ${entries.map(([k]) => k).join(", ")}`,
  );

  for (const [key, value] of entries) {
    api.variables.set(key, value);
    api.log.info(`[variable] ${key} = ${JSON.stringify(value)}`);
  }

  return {
    input: entries.length > 0 ? Object.fromEntries(entries) : {},
    raw: { vars: api.variables.all(), setCount: entries.length },
  };
};
