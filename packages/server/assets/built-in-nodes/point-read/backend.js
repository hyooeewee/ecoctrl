module.exports = async function execute(ctx, api) {
  const pointName = String(ctx.config.pointName || "");

  if (!pointName) {
    api.log.error("[point-read] missing required field 'pointName'");
    throw new Error("point-read node requires 'pointName'");
  }

  api.log.info(`[point-read] reading point: ${pointName}`);

  let values;
  try {
    values = await api.iot.readPoints([pointName]);
  } catch (err) {
    api.log.error(`[point-read] failed to read point ${pointName}: ${err.message}`);
    throw new Error(`读取测点 ${pointName} 失败: ${err.message}`, { cause: err });
  }

  const pointData = values?.ResultPointObjArr?.[0];
  if (!pointData) {
    api.log.error(`[point-read] point ${pointName} not found or returned empty data`);
    throw new Error(`测点 ${pointName} 不存在或返回空数据`);
  }

  const value = pointData.value;
  api.log.info(`[point-read] point ${pointName} = ${JSON.stringify(value)}`);
  return { value, pointName, values };
};
