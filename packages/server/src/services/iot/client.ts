import { ensureToken, authorize } from "@/services/iot/auth";
import type { IotResponse } from "@/services/iot/types";
import { env } from "@/lib/env";

const BASE_URL = env.BASE_URL?.replace(/\/+$/, "") || "";
const APP_ID = env.APP_ID || "";

export async function iotRequest(
  path: string,
  options: RequestInit = {},
  extraHeaders?: Record<string, string>,
): Promise<IotResponse> {
  const token = await ensureToken();
  const url = `${BASE_URL}${path}`;

  const headers = new Headers(options.headers);
  headers.set("appId", APP_ID);
  headers.set("Token", token);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      if (v) headers.set(k, v);
    }
  }

  const res = await fetch(url, { ...options, headers });
  const body = (await res.json()) as IotResponse;

  if (body.code === 301 || body.code === 302) {
    // Token expired — clear cache, re-auth once, then retry
    await authorize();
    return iotRequest(path, options, extraHeaders);
  }

  if (body.code !== 200) {
    throw new Error(`IoT request failed: code=${body.code}, path=${path}`);
  }

  return body;
}
