module.exports = async function execute(ctx, api) {
  const operation = String(ctx.config.operation || "select");
  const table = String(ctx.config.table || "");
  const where = ctx.config.where;
  const data = ctx.config.data;
  const returning = ctx.config.returning;

  return api.db.execute(operation, table, where, data, returning);
};
