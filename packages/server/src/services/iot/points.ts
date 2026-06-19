import { iotRequest } from "./client";

interface ReadOptions {
  codes: string[];
}

interface WriteOptions {
  aryPoints: Array<{ pointId: string; value: unknown }>;
}

interface HistoryOptions {
  codes: string[];
  beginTime: string;
  endTime: string;
  interval?: number;
}

interface AlarmOptions {
  beginTime: string;
  endTime: string;
}

export async function readPointValues(codes: string[]): Promise<Record<string, unknown>> {
  const res = await iotRequest("/_webtalk/_cur/api/getCodesVal", {
    method: "POST",
    body: JSON.stringify({ codes } satisfies ReadOptions),
  });
  return res as Record<string, unknown>;
}

export async function writePointValues(
  aryPoints: Array<{ pointId: string; value: unknown }>,
): Promise<void> {
  await iotRequest("/_webtalk/_cur/api/setCodesVal", {
    method: "POST",
    body: JSON.stringify({ aryPoints } satisfies WriteOptions),
  });
}

export async function readPointHistory(
  codes: string[],
  beginTime: string,
  endTime: string,
  interval?: number,
): Promise<Record<string, unknown>> {
  const res = await iotRequest("/_webtalk/_cur/api/getCodesHisVal", {
    method: "POST",
    body: JSON.stringify({ codes, beginTime, endTime, interval } satisfies HistoryOptions),
  });
  return res as Record<string, unknown>;
}

export async function getAlarmConfigurations(): Promise<Record<string, unknown>> {
  const res = await iotRequest("/_webtalk/_cur/api/getAlarmConfigs", {
    method: "POST",
    body: JSON.stringify({}),
  });
  const { code, msg, ...values } = res as Record<string, unknown>;
  void code;
  void msg;
  return values;
}

export async function getHistoricalAlarms(
  beginTime: string,
  endTime: string,
  options?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await iotRequest("/_webtalk/_cur/api/getHisAlarms", {
    method: "POST",
    body: JSON.stringify({ beginTime, endTime, ...options } satisfies AlarmOptions &
      Record<string, unknown>),
  });
  const { code, msg, ...values } = res as Record<string, unknown>;
  void code;
  void msg;
  return values;
}

export async function forceWritePointValues(
  aryPoints: Array<{ pointId: string; value: unknown }>,
): Promise<void> {
  await iotRequest("/_webtalk/_cur/api/forceSetCodesVal", {
    method: "POST",
    body: JSON.stringify({ aryPoints } satisfies WriteOptions),
  });
}

export async function readPointProperties(
  codes: string[],
  prop?: string,
): Promise<Record<string, unknown>> {
  const extraHeaders = prop ? { prop } : undefined;
  const res = await iotRequest(
    "/_webtalk/_cur/api/getCodesVal",
    {
      method: "POST",
      body: JSON.stringify({ codes } satisfies ReadOptions),
    },
    extraHeaders,
  );
  return res as Record<string, unknown>;
}
