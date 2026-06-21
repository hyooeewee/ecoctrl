/**
 * Point Read — EcoCtrl Plugin Node
 * Category: action
 *
 * Supports:
 *   - one or more points by `pointNames`
 *   - historical data when `mode` is "history"
 */

function collectNames(config) {
  const names = [];

  if (Array.isArray(config.pointNames) && config.pointNames.length > 0) {
    for (const item of config.pointNames) {
      const s = String(item).trim();
      if (s) names.push(s);
    }
  }

  // Backward compatibility: older DSL may still use pointName
  if (names.length === 0 && typeof config.pointName === "string" && config.pointName.trim()) {
    for (const s of config.pointName.split(",")) {
      const trimmed = s.trim();
      if (trimmed) names.push(trimmed);
    }
  }

  return names;
}

module.exports = async function execute(ctx, api) {
  const mode = String(ctx.config.mode || "current");
  const names = collectNames(ctx.config);
  const firstName = names[0] || "";

  if (mode === "history") {
    if (!firstName) {
      api.log.error("[point-read] history mode requires 'pointNames'");
      throw new Error("history 模式需要填写 pointNames");
    }

    const beginTime = String(ctx.config.beginTime || "").trim();
    const endTime = String(ctx.config.endTime || "").trim();
    if (!beginTime || !endTime) {
      api.log.error("[point-read] history mode requires beginTime and endTime");
      throw new Error("history 模式需要填写 beginTime 和 endTime");
    }

    api.log.info(`[point-read] history: ${firstName} from ${beginTime} to ${endTime}`);

    let raw;
    try {
      raw = await api.iot.readPointHistory([firstName], beginTime, endTime);
    } catch (err) {
      api.log.error(`[point-read] history read failed for ${firstName}: ${err.message}`);
      throw new Error(`读取点位 ${firstName} 历史数据失败: ${err.message}`, { cause: err });
    }

    api.log.info(`[point-read] history read success for ${firstName}`);

    return { input: { pointNames: names, beginTime, endTime }, raw };
  }

  // current mode
  if (names.length === 0) {
    api.log.error("[point-read] missing required field 'pointNames'");
    throw new Error("point-read 节点需要 pointNames");
  }

  api.log.info(`[point-read] reading ${names.length} point(s): ${names.join(", ")}`);

  let raw;
  try {
    raw = await api.iot.readPoints(names);
  } catch (err) {
    api.log.error(`[point-read] failed to read points: ${err.message}`);
    throw new Error(`读取点位失败: ${err.message}`, { cause: err });
  }

  const points = {};

  // Prefer structured array if the gateway returns one
  const arr = raw?.ResultPointObjArr;
  if (Array.isArray(arr)) {
    for (const item of arr) {
      const name = item?.pointId || item?.name || item?.code || item?.pointName;
      if (name) {
        points[name] = toNumber(item?.value);
      }
    }
  }

  // Fallback: direct code -> value map (some gateways omit ResultPointObjArr)
  if (Object.keys(points).length === 0 && raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (key === "code" || key === "msg" || Array.isArray(val)) continue;
      if (val && typeof val === "object" && "value" in val) {
        points[key] = toNumber(val.value);
      } else {
        points[key] = toNumber(val);
      }
    }
  }

  // Ensure every requested point has an entry (missing = 0)
  for (const name of names) {
    if (!(name in points)) {
      api.log.warn(`[point-read] no value returned for ${name}, treating as 0`);
      points[name] = 0;
    }
  }

  const firstValue = points[firstName];

  api.log.info(
    `[point-read] ${names.length} point(s) read; first ${firstName} = ${JSON.stringify(firstValue)}`,
  );

  return { input: { pointNames: names }, raw };
};
