import { get, post, put } from "./request";
import type { PublicSystemConfig, SystemConfig } from "@ecoctrl/shared";

export const systemConfigApi = {
  get: () => get<SystemConfig>("/configs"),
  getPublic: () => get<PublicSystemConfig>("/public/config"),
  update: (data: Partial<SystemConfig>) => put<SystemConfig>("/configs", data),
  testEmail: (to: string) => post<{ success: boolean }>("/configs/test-email", { to }),
  verifySmtp: () => post<{ success: boolean }>("/configs/verify-smtp"),
};
