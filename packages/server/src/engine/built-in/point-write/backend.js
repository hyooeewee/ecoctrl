module.exports = async function execute(ctx, api) {
  const pointName = String(ctx.config.pointName || "");
  const valueKey = String(ctx.config.valueKey || "");
  const value = ctx.config.value;

  if (!pointName) {
    throw new Error("point_write node requires 'pointName'");
  }
  if (!valueKey) {
    throw new Error("point_write node requires 'valueKey'");
  }

  await api.iot.writePoint(pointName, { [valueKey]: value });
  return { updated: true, pointName, valueKey, value };
};
