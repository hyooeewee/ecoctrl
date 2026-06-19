module.exports = async function execute(ctx, api) {
  const pointName = String(ctx.config.pointName || "");
  const value = ctx.config.value;

  if (!pointName) {
    api.log.error("[point-write] missing required field 'pointName'");
    throw new Error("point-write node requires 'pointName'");
  }
  if (value === undefined || value === null) {
    api.log.error("[point-write] missing required field 'value'");
    throw new Error("point-write node requires 'value'");
  }

  api.log.info(`[point-write] writing ${JSON.stringify(value)} to ${pointName}`);

  try {
    await api.iot.writePoint(pointName, value);
  } catch (err) {
    api.log.error(
      `[point-write] failed to write ${JSON.stringify(value)} to ${pointName}: ${err.message}`,
    );
    throw new Error(`写入测点 ${pointName} 失败: ${err.message}`, { cause: err });
  }

  api.log.info(`[point-write] successfully wrote to ${pointName}`);
  return { updated: true, pointName, value };
};
