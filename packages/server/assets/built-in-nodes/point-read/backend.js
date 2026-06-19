/**
 * Point Read — EcoCtrl Plugin Node
 * Category: action
 *
 * Supports:
 *   - single point by `pointName`
 *   - multiple points by `pointNames` array or comma-separated `pointName`
 *   - historical data when `mode` is "history"
 */

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function collectNames(config) {
  const names = [];

  if (Array.isArray(config.pointNames) && config.pointNames.length > 0) {
    for (const item of config.pointNames) {
      const s = String(item).trim();
      if (s) names.push(s);
    }
  }

  if (typeof config.pointName === "string" && config.pointName.trim()) {
    for (const s of config.pointName.split(",")) {
      const trimmed = s.trim();
      if (trimmed) names.push(trimmed);
    }
  } else if (config.pointName) {
    const s = String(config.pointName).trim();
    if (s) names.push(s);
  }

  return names;
}

module.exports = async function execute(ctx, api) {
  const mode = String(ctx.config.mode || "current");

  if (mode === "history") {
    const pointName = String(ctx.config.pointName || "").trim();
    if (!pointName) {
      api.log.error("[point-read] history mode requires 'pointName'");
      throw new Error("history 模式需要填写单个 pointName");
    }

    const beginTime = String(ctx.config.beginTime || "").trim();
    const endTime = String(ctx.config.endTime || "").trim();
    if (!beginTime || !endTime) {
      api.log.error("[point-read] history mode requires beginTime and endTime");
      throw new Error("history 模式需要填写 beginTime 和 endTime");
    }

    const interval = Number(ctx.config.interval || 0);

    api.log.info(
      `[point-read] history: ${pointName} from ${beginTime} to ${endTime} interval=${interval}`,
    );

    let history;
    try {
      history = await api.iot.readPointHistory(pointName, beginTime, endTime, interval);
    } catch (err) {
      api.log.error(`[point-read] history read failed for ${pointName}: ${err.message}`);
      throw new Error(`读取点位 ${pointName} 历史数据失败: ${err.message}`, { cause: err });
    }

    api.log.info(`[point-read] history read success for ${pointName}`);

    return {
      pointName,
      beginTime,
      endTime,
      interval,
      mode,
      history,
      values: history,
    };
  }

  // current mode
  const names = collectNames(ctx.config);
  if (names.length === 0) {
    api.log.error("[point-read] missing required field 'pointName' or 'pointNames'");
    throw new Error("point-read 节点需要 pointName 或 pointNames");
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
      const name = item?.name || item?.code || item?.pointName;
      if (name) {
        points[name] = toNumber(item?.value);
      }
    }
  }

  // Fallback: direct code -> value map (some gateways omit ResultPointObjArr)
  if (Object.keys(points).length === 0 && raw && typeof raw === "object") {
    for (const [key, val] of Object.entries(raw)) {
      if (key === "code" || key === "msg") continue;
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

  const firstName = names[0];
  const firstValue = points[firstName];

  api.log.info(
    `[point-read] ${names.length} point(s) read; first ${firstName} = ${JSON.stringify(firstValue)}`,
  );

  return {
    value: firstValue,
    pointName: firstName,
    points,
    requestedNames: names,
    values: raw,
    mode,
  };
};
