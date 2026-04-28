import { API_PREFIX } from "~/lib/env";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    post<TokenResponse>("/auth/login", { username: email, password }),

  refresh: (refreshToken: string) => post<TokenResponse>("/auth/refresh", { refreshToken }),

  me: (accessToken: string) => get<AuthUser>("/auth/me", accessToken),

  logout: (refreshToken: string, accessToken: string) =>
    post<void>("/auth/logout", { refreshToken }, accessToken),
};
