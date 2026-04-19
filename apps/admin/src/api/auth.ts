import { get } from "./request";
import type { User } from "@ecoctrl/shared";

export type AuthUser = Pick<User, "username" | "avatarUrl">;

export const authApi = {
  me: () => get<AuthUser>("/api/auth/me"),
};
