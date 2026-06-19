/**
 * Point Read — EcoCtrl Plugin Node
 * Category: action
 *
 * Supports:
 *   - one or more points by `pointNames`
 *   - historical data when `mode` is "history"
 *   - custom output field mapping via `outputs`
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

  // Backward compatibility: older DSL may still use pointName
  if (names.length === 0 && typeof config.pointName === "string" && config.pointName.trim()) {
    for (const s of config.pointName.split(",")) {
      const trimmed = s.trim();
      if (trimmed) names.push(trimmed);
    }
  }

  return names;
}

/**
 * Extract a value from an object by dot/bracket path.
 * Examples:
 *   ResultPointObjArr[0].value
 *   ResultPointObjArr[0]["name"]
 *   data.points["C_5003_AV_0131"]
 */
function getValueAtPath(obj, path) {
  if (path === undefined || path === null || path === "") return undefined;
  const pathStr = String(path).trim();
  if (!pathStr) return undefined;

  let current = obj;
  const parts = pathStr.split(".");

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    const bracketMatch = part.match(/^([^[]+)((?:\[[^\]]+\])+)$/);
    if (bracketMatch) {
      const prop = bracketMatch[1];
      current = current[prop];

      const indices = bracketMatch[2].match(/\[[^\]]+\]/g) || [];
      for (const idxRaw of indices) {
        if (current === null || current === undefined) return undefined;

        const idx = idxRaw.slice(1, -1).trim();
        const isQuoted =
          (idx.startsWith('"') && idx.endsWith('"')) || (idx.startsWith("'") && idx.endsWith("'"));

        if (isQuoted) {
          const key = idx.slice(1, -1);
          current = current[key];
        } else {
          const n = Number(idx);
          current = Array.isArray(current) ? current[n] : current[idx];
        }
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

function isExpressionTemplate(str) {
  if (typeof str !== "string") return false;
  const s = str.trim();
  return s.startsWith("{{") && s.endsWith("}}");
}

function resolveOutputValue(raw, exprOrPath, api) {
  if (exprOrPath === null || exprOrPath === undefined) return undefined;

  // Expression template: {{ raw["ResultPointObjArr"][0]["data"][0]["value"] + ... }}
  if (isExpressionTemplate(exprOrPath)) {
    const inner = exprOrPath.trim().slice(2, -2).trim();
    api.variables.set("raw", raw);
    try {
      return api.expr.evaluateExpression(inner);
    } catch (err) {
      api.log.warn(`[point-read] custom output expression failed: ${err.message}`);
      return undefined;
    }
  }

  // Plain path string
  return getValueAtPath(raw, String(exprOrPath));
}

function applyCustomOutputs(raw, configOutputs, api) {
  const mapped = {};
  if (configOutputs && typeof configOutputs === "object" && !Array.isArray(configOutputs)) {
    for (const [key, exprOrPath] of Object.entries(configOutputs)) {
      mapped[key] = resolveOutputValue(raw, exprOrPath, api);
    }
  }
  return mapped;
}

module.exports = async function execute(ctx, api) {
  const mode = String(ctx.config.mode || "current");
  const names = collectNames(ctx.config);
  const firstName = names[0] || "";
  const retry = Number(ctx.config.retry || 0);

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

    const custom = applyCustomOutputs(raw, ctx.config.outputs, api);
    if (Object.keys(custom).length > 0) {
      return { raw, mode, retry, ...custom };
    }

    return {
      pointName: firstName,
      beginTime,
      endTime,
      mode,
      retry,
      raw,
    };
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

  const custom = applyCustomOutputs(raw, ctx.config.outputs, api);
  if (Object.keys(custom).length > 0) {
    return { raw, mode, retry, points, ...custom };
  }

  return {
    value: firstValue,
    pointName: firstName,
    points,
    requestedNames: names,
    mode,
    retry,
    raw,
  };
};
