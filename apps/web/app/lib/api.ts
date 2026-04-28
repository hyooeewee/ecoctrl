import { authApi } from "~/lib/auth-api";
import { useAuthStore } from "~/store/auth";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  ok: boolean;
}

// ─── Token refresh orchestration ──────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(refreshToken: string): Promise<string | null> {
  try {
    const data = await authApi.refresh(refreshToken);
    const { setTokens } = useAuthStore.getState();
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return data.accessToken;
  } catch {
    const { clearTokens } = useAuthStore.getState();
    clearTokens();
    return null;
  }
}

function processQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

// ─── Request helpers ──────────────────────────────────────────────────────────

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

export async function apiPatch<T>(
  endpoint: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, "PATCH", body, extraHeaders);
}

async function request<T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
  extraHeaders?: Record<string, string>,
  params?: Record<string, string>,
): Promise<ApiResponse<T>> {
  let url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams(params).toString();
    url += `?${search}`;
  }

  const { accessToken, refreshToken } = useAuthStore.getState();

  const execute = async (token: string | null): Promise<ApiResponse<T>> => {
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
    };
    if (body) {
      init.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url, init);

      // Handle 401 by refreshing token
      if (res.status === 401 && refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          const newToken = await doRefresh(refreshToken);
          isRefreshing = false;
          processQueue(newToken);

          if (!newToken) {
            return { ok: false, error: "Session expired" };
          }
          return execute(newToken);
        }

        return new Promise<ApiResponse<T>>((resolve) => {
          refreshQueue.push((tk) => {
            if (tk) resolve(execute(tk));
            else resolve({ ok: false, error: "Session expired" });
          });
        });
      }

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = (await res.json()) as T;
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  return execute(accessToken);
}
