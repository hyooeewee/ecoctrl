import xlsx from "xlsx";

export interface PointItem {
  id: string;
  name: string;
  pointType: string;
  pointNo: string;
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

  const headerRow = rows[0].map((h) => String(h ?? "").trim());
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

  // Extract deviceType from the first data row's point name
  const firstRow = rows[1];
  const firstName = idxName >= 0 ? String(firstRow[idxName] ?? "").trim() : "";
  const deviceType = extractDeviceTypeFromName(firstName);
  if (!deviceType) {
    throw new Error(
      'Cannot extract deviceType from point name. Expected format: "C_0101_AI_0000". Please ensure the "点位名" column contains the device type prefix.',
    );
  }

  // Group by device name
  const deviceMap = new Map<string, PointItem[]>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
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
