module.exports = async function execute(ctx, api) {
  const pointName = String(ctx.config.pointName || "");
  if (!pointName) {
    throw new Error("point_read node requires 'pointName'");
  }
  const values = await api.iot.readPoints([pointName]);
  return { value: values[pointName], pointName, values };
};
