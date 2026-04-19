import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { iotTokens } from "@/schemas/iotTokens";

const BASE_URL = process.env.BASE_URL?.replace(/\/+$/, "") || "";
const APP_ID = process.env.APP_ID || "";

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

let tokenCache: TokenData | null = null;

async function loadToken(): Promise<TokenData | null> {
  const rows = await db.select().from(iotTokens);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    accessToken: r.accessToken,
    refreshToken: r.refreshToken,
    expiresAt: r.expiresAt,
  };
}

async function saveToken(token: TokenData): Promise<void> {
  const rows = await db.select().from(iotTokens);
  if (rows.length > 0) {
    await db
      .update(iotTokens)
      .set({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
      })
      .where(eq(iotTokens.id, rows[0].id));
  } else {
    await db.insert(iotTokens).values(token);
  }
}

async function getToken(): Promise<TokenData | null> {
  if (tokenCache) return tokenCache;
  tokenCache = await loadToken();
  return tokenCache;
}

function parseJwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as Record<string, unknown>;
    const exp = Number(payload.exp);
    if (exp && exp > 1_000_000_000) return exp * 1000; // JWT exp is in seconds
  } catch {
    // ignore
  }
  return Date.now() + 2 * 60 * 60 * 1000; // default 2h
}

function extractTokenData(data: Record<string, unknown>): TokenData {
  const accessToken = String(data.access_token ?? "");
  const refreshToken = String(data.refresh_token ?? "");
  return {
    accessToken,
    refreshToken,
    expiresAt: parseJwtExp(accessToken),
  };
}

async function fetchToken(grantType: "authorization" | "refresh", refreshTokenValue?: string): Promise<TokenData> {
  const url = new URL("/_webtalk/_cur/api/access_token", BASE_URL);
  url.searchParams.set("grant_type", grantType);
  url.searchParams.set("appId", APP_ID);
  if (grantType === "refresh" && refreshTokenValue) {
    url.searchParams.set("refreshToken", refreshTokenValue);
  }

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token ${grantType} HTTP failed: ${res.status} ${text}`);
  }

  const body = (await res.json()) as Record<string, unknown>;

  if (body.code !== undefined && body.code !== 200) {
    throw new Error(`Token ${grantType} failed: code=${body.code}, msg=${JSON.stringify(body)}`);
  }

  const tokenData = extractTokenData(body);
  if (!tokenData.accessToken) {
    throw new Error(`Token ${grantType} returned empty access_token`);
  }
  return tokenData;
}

export async function authorize(): Promise<string> {
  const tokenData = await fetchToken("authorization");
  await saveToken(tokenData);
  tokenCache = tokenData;
  return tokenData.accessToken;
}

export async function refreshToken(): Promise<string> {
  const current = await getToken();
  if (!current?.refreshToken) {
    return authorize();
  }

  try {
    const tokenData = await fetchToken("refresh", current.refreshToken);
    await saveToken(tokenData);
    tokenCache = tokenData;
    return tokenData.accessToken;
  } catch (err) {
    return authorize();
  }
}

export async function ensureToken(): Promise<string> {
  const token = await getToken();
  if (!token || Date.now() >= token.expiresAt - 60000) {
    return refreshToken();
  }
  return token.accessToken;
}

interface IotResponse {
  code: number;
  [key: string]: unknown;
}

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
    tokenCache = null;
    await authorize();
    return iotRequest(path, options, extraHeaders);
  }

  if (body.code !== 200) {
    throw new Error(`IoT request failed: code=${body.code}, path=${path}`);
  }

  return body;
}
