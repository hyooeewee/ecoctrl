import { get, post } from "./request";

export interface AuthUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  authType?: "password" | "oauth";
  provider?: string;
  email?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (username: string, password: string, remember?: boolean) =>
    post<TokenResponse>("/auth/login", { username, password, remember }),

  register: (username: string, email: string, password: string) =>
    post<TokenResponse>("/auth/register", { username, email, password }),

  sendVerifyCode: (email: string) =>
    post<{ ok: boolean }>("/auth/forgot-password/send-code", { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    post<{ ok: boolean }>("/auth/forgot-password/reset", { email, code, newPassword }),

  sendBindEmailCode: (email: string) =>
    post<{ ok: boolean }>("/auth/bind-email/send-code", { email }),

  bindEmail: (email: string, code: string, password: string) =>
    post<{ ok: boolean }>("/auth/bind-email", { email, code, password }),

  me: () => get<AuthUser>("/auth/me"),

  refresh: (refreshToken: string) => post<TokenResponse>("/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) => post<void>("/auth/logout", { refreshToken }),
};
