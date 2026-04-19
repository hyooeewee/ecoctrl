import { get } from "./request";
import { AuthUser } from "../types";

export const authApi = {
  me: () => get<AuthUser>("/api/auth/me"),
};
