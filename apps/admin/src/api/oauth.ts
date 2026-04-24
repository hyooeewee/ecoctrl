import { get, post, del } from "./request";

export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
}

export interface OAuthBindPayload {
  provider: string;
  providerUserId: string;
  tempToken: string;
  username: string;
  password: string;
}

export interface OAuthRegisterPayload {
  provider: string;
  providerUserId: string;
  tempToken: string;
  username: string;
  email: string;
}

export interface LinkedOAuthAccount {
  provider: string;
  providerEmail?: string;
  createdAt: string;
}

export const oauthApi = {
  getProviders: () => get<OAuthProvider[]>("/auth/oauth/providers"),

  bindAccount: (data: OAuthBindPayload) =>
    post<{ accessToken: string; refreshToken: string }>("/auth/oauth/bind", data),

  registerAndBind: (data: OAuthRegisterPayload) =>
    post<{ accessToken: string; refreshToken: string }>("/auth/oauth/register-bind", data),

  getLinkedAccounts: () => get<LinkedOAuthAccount[]>("/auth/oauth/linked"),

  unlink: (provider: string) => del<void>(`/auth/oauth/${provider}`),
};
