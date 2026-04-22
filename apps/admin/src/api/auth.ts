import { get, post } from "./request";

export interface AuthUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (username: string, password: string, remember?: boolean) =>
    post<TokenResponse>("/api/auth/login", { username, password, remember }),

  me: () => get<AuthUser>("/api/auth/me"),

  refresh: (refreshToken: string) => post<TokenResponse>("/api/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) => post<void>("/api/auth/logout", { refreshToken }),
};
