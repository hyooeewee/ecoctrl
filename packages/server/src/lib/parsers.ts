import xlsx from "xlsx";

export interface PointItem {
  id: string;
  name: string;
  pointType: string;
  pointNo: string;
  description?: string;
  region?: string;
  system?: string;
  props: { key: string; name: string; unit?: string }[];
}

export interface ParsedDevice {
  deviceName: string;
  points: PointItem[];
}

export interface ParseResult {
  deviceType: string;
  devices: ParsedDevice[];
}

function pad4(n: string | number): string {
  return String(n).padStart(4, "0");
}

function buildProp(
  key: string,
  name: string,
  value?: string | number,
): { key: string; name: string } | null {
  if (value === undefined || value === null || value === "") return null;
  const v = String(value).trim();
  if (v === "" || v === "0") return null;
  return { key, name };
}

function extractDeviceTypeFromName(name: string): string | null {
  const match = name.match(/^([A-Z])_/);
  return match ? match[1] : null;
}

/**
 * Parse a WebTalk address like "C_5001_BV_0002" or "C_5930-5_AV_0000".
 * Returns null if the format is not recognized.
 */
function parseWebtalkAddress(address: string): {
  deviceType: string;
  deviceCode: string;
  pointType: string;
  pointNo: string;
} | null {
  const trimmed = address.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("_");
  if (parts.length < 4) return null;
  const [deviceType, deviceCode, pointType, pointNoRaw] = parts;
  if (!deviceType || !deviceCode || !pointType || !pointNoRaw) return null;
  // Some addresses have an extra trailing segment; take the last 4-digit block.
  const pointNo = pad4(pointNoRaw);
  return { deviceType, deviceCode, pointType, pointNo };
}

export function parseJsonPoints(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON file must contain an array of point items");
  }
  if (parsed.length === 0) {
    throw new Error("JSON file is empty");
  }

  // Extract deviceType from the first item's name
  const firstName = String(parsed[0].name ?? "");
  const deviceType = extractDeviceTypeFromName(firstName);
  if (!deviceType) {
    throw new Error(
      'Cannot extract deviceType from point name. Expected format: "C_0101_AI_0000". Please ensure the "name" field contains the device type prefix.',
    );
  }

  const points: PointItem[] = parsed.map((p: Record<string, unknown>) => {
    const pointType = String(p.pointType ?? "").toUpperCase();
    const pointNo = pad4((p.pointNo as string | number) ?? "0");
    const name = String(p.name ?? "");
    return {
      id: String(p.id ?? ""),
      name: name || `${deviceType}_${pointType}_${pointNo}`,
      pointType,
      pointNo,
      props: Array.isArray(p.props)
        ? p.props.map((prop: Record<string, unknown>) => ({
            key: String(prop.key ?? ""),
            name: String(prop.name ?? ""),
            unit: prop.unit ? String(prop.unit) : undefined,
          }))
        : [],
    };
  });

  return { deviceType, devices: [{ deviceName: "default", points }] };
}

export function parseCsvPoints(buffer: Buffer): ParseResult {
  const text = buffer.toString("utf-8");
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV file must contain at least a header row and one data row");
  }

  const headers = parseCsvLine(lines[0]);

  // New CSV format: contains WebTalk address column.
  const hasWebtalkAddr = headers.indexOf("webtalk地址") >= 0 || headers.indexOf("webtalkAddr") >= 0;
  if (hasWebtalkAddr) {
    return parseWebtalkCsvPoints(lines, headers);
  }

  return parseLegacyCsvPoints(lines, headers);
}

/**
 * Parse the new 点位分组.csv format where each row has a WebTalk address.
 *
 * Mapping:
 * - model code  = first segment of webtalk地址 (e.g. "C")
 * - object code = second segment of webtalk地址 (e.g. "5001" or "5930-5")
 * - point type  = third segment of webtalk地址 (e.g. "BV" / "AV")
 * - point code  = fourth segment of webtalk地址 (e.g. "0002")
 * - region      = 区域
 * - system      = 来源
 */
function parseWebtalkCsvPoints(lines: string[], headers: string[]): ParseResult {
  const get = (row: string[], h: string) => row[headers.indexOf(h)] ?? "";
  const getAny = (row: string[], candidates: string[]) => {
    for (const c of candidates) {
      const idx = headers.indexOf(c);
      if (idx >= 0 && row[idx]) return row[idx];
    }
    return "";
  };

  const idxWebtalk = headers.indexOf("webtalk地址");
  const webtalkIdx = idxWebtalk >= 0 ? idxWebtalk : headers.indexOf("webtalkAddr");

  const firstRow = parseCsvLine(lines[1]);
  const firstAddress = firstRow[webtalkIdx] ?? "";
  const parsedFirst = parseWebtalkAddress(firstAddress);
  if (!parsedFirst) {
    throw new Error(
      `无法从 webtalk地址 提取设备类型。第一行地址："${firstAddress}"，期望格式如 "C_5001_BV_0002"。`,
    );
  }

  const deviceType = parsedFirst.deviceType;
  const deviceMap = new Map<string, PointItem[]>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const address = values[webtalkIdx] ?? "";
    const parsed = parseWebtalkAddress(address);
    if (!parsed) {
      throw new Error(`第 ${i + 1} 行的 webtalk地址 格式不正确："${address}"`);
    }

    const region = get(values, "区域").trim();
    const system = get(values, "来源").trim();
    const remark = get(values, "备注").trim();
    const location = get(values, "位置").trim();
    const button = get(values, "按钮").trim();
    const group = get(values, "分组").trim();
    const registerRaw = get(values, "寄存器地址(原始)").trim();
    const registerNum = get(values, "寄存器地址(数字)").trim();
    const registerCount = get(values, "寄存器数量").trim();
    const variableType = getAny(values, ["变量类型", "varType"]).trim();
    const dataType = getAny(values, ["数据类型", "dataType"]).trim();

    const name = address;
    const description = remark || undefined;

    const props: { key: string; name: string }[] = [];
    if (variableType) props.push({ key: "variableType", name: "变量类型" });
    if (dataType) props.push({ key: "dataType", name: "数据类型" });
    if (registerRaw) props.push({ key: "registerRaw", name: "寄存器地址(原始)" });
    if (registerNum) props.push({ key: "registerNum", name: "寄存器地址(数字)" });
    if (registerCount) props.push({ key: "registerCount", name: "寄存器数量" });
    if (location) props.push({ key: "location", name: "位置" });
    if (button) props.push({ key: "button", name: "按钮" });
    if (group) props.push({ key: "group", name: "分组" });

    const point: PointItem = {
      id: "",
      name,
      pointType: parsed.pointType,
      pointNo: parsed.pointNo,
      description,
      region: region || undefined,
      system: system || undefined,
      props,
    };

    const deviceCode = parsed.deviceCode;
    if (!deviceMap.has(deviceCode)) {
      deviceMap.set(deviceCode, []);
    }
    deviceMap.get(deviceCode)!.push(point);
  }

  const devices: ParsedDevice[] = [];
  for (const [deviceName, points] of deviceMap) {
    devices.push({ deviceName, points });
  }

  return { deviceType, devices };
}

function parseLegacyCsvPoints(lines: string[], headers: string[]): ParseResult {
  const idxName =
    headers.indexOf("点位名") >= 0 ? headers.indexOf("点位名") : headers.indexOf("name");

  // Extract deviceType from the first data row's name
  const firstValues = parseCsvLine(lines[1]);
  const firstName = idxName >= 0 ? (firstValues[idxName] ?? "") : "";
  const deviceType = extractDeviceTypeFromName(firstName);
  if (!deviceType) {
    throw new Error(
      'Cannot extract deviceType from point name. Expected format: "C_0101_AI_0000". Please ensure the "name" column contains the device type prefix.',
    );
  }

  const points: PointItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const get = (h: string) => values[headers.indexOf(h)] ?? "";

    const deviceName = get("设备名称") || get("deviceName") || "";
    const pointType = (get("点位类型") || get("pointType") || "").toUpperCase();
    const pointNo = pad4(get("点位地址") || get("pointNo") || "0");
    const name = get("点位名") || get("name") || "";
    const desc = get("描述") || get("description") || "";

    const props: { key: string; name: string }[] = [];
    const saveHistory = buildProp("saveHistory", "保存历史", get("保存历史"));
    if (saveHistory) props.push(saveHistory);
    const collectData = buildProp("collectData", "后台采数", get("后台采数"));
    if (collectData) props.push(collectData);

    // operator1 / operator2 columns
    for (let col = 1; col <= 2; col++) {
      const op = get(`运算符${col}`) || get(`operator${col}`) || "";
      const opParam = get(`运算符${col}参数`) || get(`operator${col}Param`) || "";
      if (op.trim()) {
        props.push({ key: `operator${col}`, name: `运算符${col}` });
      }
      if (opParam.trim()) {
        props.push({ key: `operator${col}Param`, name: `运算符${col}参数` });
      }
    }

    const finalName = name || desc || `${deviceType}_${deviceName}_${pointType}_${pointNo}`;

    points.push({
      id: "",
      name: finalName,
      pointType,
      pointNo,
      props,
    });
  }

  // CSV without device name column: treat as single group
  return { deviceType, devices: [{ deviceName: "default", points }] };
}

// Known header candidates used for auto-detection
const HEADER_CANDIDATES = [
  "设备名称",
  "deviceName",
  "点位类型",
  "pointType",
  "类型",
  "type",
  "点位地址",
  "pointNo",
  "地址",
  "addr",
  "address",
  "点位名",
  "name",
  "点位名称",
  "pointName",
  "保存历史",
  "saveHistory",
  "后台采数",
  "collectData",
  "运算符1",
  "operator1",
  "运算符1参数",
  "operator1Param",
  "运算符2",
  "operator2",
  "运算符2参数",
  "operator2Param",
  "描述",
  "description",
  "desc",
  "区域",
  "region",
  "按钮",
  "button",
  "分组",
  "group",
  "位置",
  "location",
  "变量类型",
  "varType",
  "寄存器地址(原始)",
  "registerRaw",
  "寄存器地址(数字)",
  "registerNum",
  "寄存器数量",
  "registerCount",
  "数据类型",
  "dataType",
  "webtalk地址",
  "webtalkAddr",
  "备注",
  "remark",
  "来源",
  "source",
  "system",
];

/**
 * Find the header row by scanning for known column names.
 * Returns the header row index and the normalized header cells.
 */
function findHeaderRow(rows: (string | number | undefined)[][]): {
  headerIdx: number;
  headerRow: string[];
} {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map((h) => String(h ?? "").trim());
    const matches = row.filter((cell) =>
      HEADER_CANDIDATES.some((c) => cell === c || cell.startsWith(c)),
    );
    // Treat as header if at least 2 known columns are found
    if (matches.length >= 2) {
      return { headerIdx: i, headerRow: row };
    }
  }
  throw new Error(
    "无法识别表头行。请确保文件包含以下列名中的至少两项：" +
      "设备名称、点位类型、点位地址、点位名、描述等。",
  );
}

export function parseXlsxPoints(buffer: Buffer): ParseResult {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error("XLSX file is empty or has no sheets");
  }

  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as (
    | string
    | number
    | undefined
  )[][];
  if (rows.length < 2) {
    throw new Error("XLSX file must contain at least a header row and one data row");
  }

  // Auto-detect header row instead of assuming rows[0]
  const { headerIdx, headerRow } = findHeaderRow(rows);

  const getHeaderIndex = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = headerRow.findIndex((h) => h === c || h.startsWith(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxWebtalk = getHeaderIndex(["webtalk地址", "webtalkAddr"]);
  if (idxWebtalk >= 0) {
    return parseWebtalkXlsxPoints(rows, headerIdx, headerRow, idxWebtalk);
  }

  return parseLegacyXlsxPoints(rows, headerIdx, headerRow);
}

function parseWebtalkXlsxPoints(
  rows: (string | number | undefined)[][],
  headerIdx: number,
  headerRow: string[],
  idxWebtalk: number,
): ParseResult {
  const getHeaderIndex = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = headerRow.findIndex((h) => h === c || h.startsWith(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxRegion = getHeaderIndex(["区域", "region"]);
  const idxSystem = getHeaderIndex(["来源", "source", "system"]);
  const idxRemark = getHeaderIndex(["备注", "remark"]);
  const idxLocation = getHeaderIndex(["位置", "location"]);
  const idxButton = getHeaderIndex(["按钮", "button"]);
  const idxGroup = getHeaderIndex(["分组", "group"]);
  const idxRegisterRaw = getHeaderIndex(["寄存器地址(原始)", "registerRaw"]);
  const idxRegisterNum = getHeaderIndex(["寄存器地址(数字)", "registerNum"]);
  const idxRegisterCount = getHeaderIndex(["寄存器数量", "registerCount"]);
  const idxVarType = getHeaderIndex(["变量类型", "varType"]);
  const idxDataType = getHeaderIndex(["数据类型", "dataType"]);

  const firstDataIdx = headerIdx + 1;
  if (firstDataIdx >= rows.length) {
    throw new Error("XLSX file has a header row but no data rows");
  }

  const firstAddress = String(rows[firstDataIdx][idxWebtalk] ?? "").trim();
  const parsedFirst = parseWebtalkAddress(firstAddress);
  if (!parsedFirst) {
    throw new Error(
      `无法从 webtalk地址 提取设备类型。第一行地址："${firstAddress}"，期望格式如 "C_5001_BV_0002"。`,
    );
  }

  const deviceType = parsedFirst.deviceType;
  const deviceMap = new Map<string, PointItem[]>();

  for (let i = firstDataIdx; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((cell) => cell === undefined || String(cell).trim() === "")) {
      continue;
    }

    const address = String(row[idxWebtalk] ?? "").trim();
    const parsed = parseWebtalkAddress(address);
    if (!parsed) {
      throw new Error(`第 ${i + 1} 行的 webtalk地址 格式不正确："${address}"`);
    }

    const get = (idx: number) => (idx >= 0 ? String(row[idx] ?? "").trim() : "");

    const region = get(idxRegion);
    const system = get(idxSystem);
    const remark = get(idxRemark);
    const location = get(idxLocation);
    const button = get(idxButton);
    const group = get(idxGroup);
    const registerRaw = get(idxRegisterRaw);
    const registerNum = get(idxRegisterNum);
    const registerCount = get(idxRegisterCount);
    const variableType = get(idxVarType);
    const dataType = get(idxDataType);

    const name = address;
    const description = remark || undefined;

    const props: { key: string; name: string }[] = [];
    if (variableType) props.push({ key: "variableType", name: "变量类型" });
    if (dataType) props.push({ key: "dataType", name: "数据类型" });
    if (registerRaw) props.push({ key: "registerRaw", name: "寄存器地址(原始)" });
    if (registerNum) props.push({ key: "registerNum", name: "寄存器地址(数字)" });
    if (registerCount) props.push({ key: "registerCount", name: "寄存器数量" });
    if (location) props.push({ key: "location", name: "位置" });
    if (button) props.push({ key: "button", name: "按钮" });
    if (group) props.push({ key: "group", name: "分组" });

    const point: PointItem = {
      id: "",
      name,
      pointType: parsed.pointType,
      pointNo: parsed.pointNo,
      description,
      region: region || undefined,
      system: system || undefined,
      props,
    };

    const deviceCode = parsed.deviceCode;
    if (!deviceMap.has(deviceCode)) {
      deviceMap.set(deviceCode, []);
    }
    deviceMap.get(deviceCode)!.push(point);
  }

  const devices: ParsedDevice[] = [];
  for (const [deviceName, points] of deviceMap) {
    devices.push({ deviceName, points });
  }

  return { deviceType, devices };
}

function parseLegacyXlsxPoints(
  rows: (string | number | undefined)[][],
  headerIdx: number,
  headerRow: string[],
): ParseResult {
  const getHeaderIndex = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = headerRow.findIndex((h) => h === c || h.startsWith(c));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxDevice = getHeaderIndex(["设备名称", "deviceName", "设备", "device"]);
  const idxType = getHeaderIndex(["点位类型", "pointType", "类型", "type"]);
  const idxAddr = getHeaderIndex(["点位地址", "pointNo", "地址", "addr", "address"]);
  const idxName = getHeaderIndex(["点位名", "name", "点位名称", "pointName"]);
  const idxSaveHist = getHeaderIndex(["保存历史", "saveHistory"]);
  const idxCollect = getHeaderIndex(["后台采数", "collectData"]);
  const idxOp1 = getHeaderIndex(["运算符1", "operator1"]);
  const idxOp1Param = getHeaderIndex(["运算符1参数", "operator1Param"]);
  const idxOp2 = getHeaderIndex(["运算符2", "operator2"]);
  const idxOp2Param = getHeaderIndex(["运算符2参数", "operator2Param"]);
  const idxDesc = getHeaderIndex(["描述", "description", "desc"]);

  // Data starts right after the detected header row
  const firstDataIdx = headerIdx + 1;
  if (firstDataIdx >= rows.length) {
    throw new Error("XLSX file has a header row but no data rows");
  }

  // Extract deviceType from the first data row's point name
  const firstRow = rows[firstDataIdx];
  const firstName = idxName >= 0 ? String(firstRow[idxName] ?? "").trim() : "";
  const deviceType = extractDeviceTypeFromName(firstName);
  if (!deviceType) {
    throw new Error(
      'Cannot extract deviceType from point name. Expected format: "C_0101_AI_0000". Please ensure the "点位名" column contains the device type prefix.',
    );
  }

  // Group by device name
  const deviceMap = new Map<string, PointItem[]>();

  for (let i = firstDataIdx; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (row.every((cell) => cell === undefined || String(cell).trim() === "")) {
      continue;
    }

    const deviceName = idxDevice >= 0 ? String(row[idxDevice] ?? "").trim() : "";
    const pointType = (idxType >= 0 ? String(row[idxType] ?? "") : "").toUpperCase();
    const pointNo = pad4(idxAddr >= 0 ? (row[idxAddr] ?? "0") : "0");
    const name = idxName >= 0 ? String(row[idxName] ?? "") : "";
    const desc = idxDesc >= 0 ? String(row[idxDesc] ?? "") : "";

    const props: { key: string; name: string }[] = [];
    const saveHistory = buildProp(
      "saveHistory",
      "保存历史",
      idxSaveHist >= 0 ? row[idxSaveHist] : undefined,
    );
    if (saveHistory) props.push(saveHistory);
    const collectData = buildProp(
      "collectData",
      "后台采数",
      idxCollect >= 0 ? row[idxCollect] : undefined,
    );
    if (collectData) props.push(collectData);

    if (idxOp1 >= 0 && String(row[idxOp1] ?? "").trim()) {
      props.push({ key: "operator1", name: "运算符1" });
    }
    if (idxOp1Param >= 0 && String(row[idxOp1Param] ?? "").trim()) {
      props.push({ key: "operator1Param", name: "运算符1参数" });
    }
    if (idxOp2 >= 0 && String(row[idxOp2] ?? "").trim()) {
      props.push({ key: "operator2", name: "运算符2" });
    }
    if (idxOp2Param >= 0 && String(row[idxOp2Param] ?? "").trim()) {
      props.push({ key: "operator2Param", name: "运算符2参数" });
    }

    const finalName = name || desc || `${deviceType}_${deviceName}_${pointType}_${pointNo}`;

    const point: PointItem = {
      id: "",
      name: finalName,
      pointType,
      pointNo,
      props,
    };

    if (!deviceMap.has(deviceName)) {
      deviceMap.set(deviceName, []);
    }
    deviceMap.get(deviceName)!.push(point);
  }

  const devices: ParsedDevice[] = [];
  for (const [deviceName, points] of deviceMap) {
    if (deviceName || points.length > 0) {
      devices.push({ deviceName: deviceName || "default", points });
    }
  }
  return {
    deviceType,
    devices: devices.length ? devices : [{ deviceName: "default", points: [] }],
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
