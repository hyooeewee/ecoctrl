module.exports = async function execute(ctx, api) {
  const pointName = String(ctx.config.pointName || "");
  const value = ctx.config.value;

  if (!pointName) {
    throw new Error("point_write node requires 'pointName'");
  }
  if (value === undefined || value === null) {
    throw new Error("point_write node requires 'value'");
  }

  await api.iot.writePoint(pointName, value);
  return { updated: true, pointName, value };
};
