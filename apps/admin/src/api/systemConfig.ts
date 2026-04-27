import { get, put } from "./request";
import type { PublicSystemConfig, SystemConfig } from "@ecoctrl/shared";

export const systemConfigApi = {
  get: () => get<SystemConfig>("/configs"),
  getPublic: () => get<PublicSystemConfig>("/public/config"),
  update: (data: Partial<SystemConfig>) => put<SystemConfig>("/configs", data),
};
