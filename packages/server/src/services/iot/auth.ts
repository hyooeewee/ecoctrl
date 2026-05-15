import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { iotTokens } from "@/schemas/iotTokens";
import type { TokenData } from "@/services/iot/types";
import { env } from "@/lib/env";

const BASE_URL = env.BASE_URL?.replace(/\/+$/, "") || "";
const APP_ID = env.APP_ID || "";

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
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as Record<
      string,
      unknown
    >;
    const exp = Number(payload.exp);
    if (exp && exp > 1_000_000_000) return exp * 1000; // JWT exp is in seconds
  } catch {
    // ignore
  }
  return Date.now() + 2 * 60 * 60 * 1000; // default 2h
}

function extractTokenData(data: Record<string, unknown>): TokenData {
  const accessToken = String(data.access_token ?? "");
  const rt = String(data.refresh_token ?? "");
  return {
    accessToken,
    refreshToken: rt,
    expiresAt: parseJwtExp(accessToken),
  };
}

async function fetchToken(
  grantType: "authorization" | "refresh",
  refreshTokenValue?: string,
): Promise<TokenData> {
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
  } catch {
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
