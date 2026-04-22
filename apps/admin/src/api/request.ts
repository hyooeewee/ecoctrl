const BASE_URL = "";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("Refresh failed");
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    return data.accessToken;
  } catch {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return null;
  }
}

function processQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

function buildHeaders(init: RequestInit, token: string | null): Record<string, string> {
  const isFormData = init.body instanceof FormData;
  return {
    Accept: "application/json",
    ...(!isFormData && init.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string>),
  };
}

async function doRequest(url: string, init: RequestInit, token: string | null): Promise<Response> {
  const execute = async (tk: string | null): Promise<Response> => {
    const res = await fetch(url, {
      headers: buildHeaders(init, tk),
      ...init,
    });

    if (res.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await doRefresh();
        isRefreshing = false;
        processQueue(newToken);

        if (!newToken) {
          window.location.reload();
          throw new Error("Session expired");
        }

        return execute(newToken);
      }

      return new Promise<Response>((resolve, reject) => {
        refreshQueue.push((tk2) => {
          if (tk2) resolve(execute(tk2));
          else reject(new Error("Session expired"));
        });
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    }

    return res;
  };

  return execute(token);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const res = await doRequest(url, init, accessToken);
  return res.json() as Promise<T>;
}

// Like request but returns the raw Response for non-JSON bodies (e.g. file downloads).
export async function fetchRaw(path: string, options: RequestOptions = {}): Promise<Response> {
  const { params, ...init } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  return doRequest(url, init, accessToken);
}

export const get = <T>(path: string, options?: RequestOptions) =>
  request<T>(path, { ...options, method: "GET" });

export const post = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined });

export const put = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  request<T>(path, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined });

export const del = <T>(path: string, options?: RequestOptions) =>
  request<T>(path, { ...options, method: "DELETE" });
