module.exports = async function execute(ctx, api) {
  const set = ctx.config.set || {};
  for (const [key, value] of Object.entries(set)) {
    api.variables.set(key, value);
  }
  return { vars: api.variables.all() };
};
