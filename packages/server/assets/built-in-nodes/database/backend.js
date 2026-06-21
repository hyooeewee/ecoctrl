module.exports = async function execute(ctx, api) {
  const operation = String(ctx.config.operation || "select");
  const table = String(ctx.config.table || "");
  const where = ctx.config.where;
  const data = ctx.config.data;
  const returning = ctx.config.returning;

  if (!table) {
    api.log.error("[database] missing required field 'table'");
    throw new Error("database node requires 'table'");
  }

  api.log.info(`[database] ${operation} on table="${table}"`);

  let result;
  try {
    result = await api.db.execute(operation, table, where, data, returning);
  } catch (err) {
    api.log.error(`[database] ${operation} on "${table}" failed: ${err.message}`);
    throw new Error(`数据库操作失败 (${operation} ${table}): ${err.message}`, { cause: err });
  }

  api.log.info(`[database] ${operation} on "${table}" succeeded`);
  return { input: { operation, table, where, data, returning }, raw: result };
};
