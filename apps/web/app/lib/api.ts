// Basic API client using env variables from .env.local
import { useAuthStore } from "~/store/auth";

const BASE_URL = import.meta.env.BASE_URL ?? "";
const APP_ID = import.meta.env.APP_ID ?? "";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  ok: boolean;
}

export interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
}

export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, "GET", undefined, undefined, params);
}

export async function apiPost<T>(
  endpoint: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, "POST", body, extraHeaders);
}

async function fetchToken(
  grantType: "authorization" | "refresh" = "authorization",
  refreshToken?: string,
): Promise<ApiResponse<TokenResponse>> {
  const params: Record<string, string> = {
    appId: APP_ID,
    grant_type: grantType,
  };
  if (refreshToken) {
    params.refreshToken = refreshToken;
    params.grant_type = "refresh";
  }
  return request<TokenResponse>("/access_token", "GET", undefined, undefined, params, false);
}

/** Authorization flow: obtains both accessToken and refreshToken. */
export async function getAccessToken(): Promise<ApiResponse<TokenResponse>> {
  const res = await fetchToken("authorization");
  if (res.ok && res.data) {
    useAuthStore.getState().setTokens({
      accessToken: res.data.access_token ?? null,
      refreshToken: res.data.refresh_token ?? null,
    });
  }
  return res;
}

/** Refresh flow: uses refreshToken to obtain a new accessToken. */
export async function getRefreshToken(refreshToken: string): Promise<ApiResponse<TokenResponse>> {
  const res = await fetchToken("refresh", refreshToken);
  if (res.ok && res.data) {
    useAuthStore.getState().setTokens({
      accessToken: res.data.access_token ?? null,
      refreshToken: res.data.refresh_token ?? null,
    });
  } else if (!res.ok) {
    useAuthStore.getState().clearTokens();
  }
  return res;
}

async function request<T>(
  endpoint: string,
  method: "GET" | "POST",
  body?: unknown,
  extraHeaders?: Record<string, string>,
  params?: Record<string, string>,
  autoRefresh = true,
): Promise<ApiResponse<T>> {
  let url = `${BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams(params).toString();
    url += `?${search}`;
  }

  const { accessToken } = useAuthStore.getState();

  try {
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        appId: APP_ID,
        ...(accessToken ? { Token: accessToken } : {}),
        ...extraHeaders,
      },
    };
    if (body) {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);

    if (res.status === 301 && autoRefresh) {
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) {
        const refreshRes = await getRefreshToken(refreshToken);
        if (refreshRes.ok) {
          return request<T>(endpoint, method, body, extraHeaders, params, false);
        }
      }
    }

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
