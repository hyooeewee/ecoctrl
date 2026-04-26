export interface ApiResponse<T> {
  data?: T;
  error?: string;
  ok: boolean;
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

  try {
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
    };
    if (body) {
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
