import { get, put } from "./request";
import type { SystemConfig } from "@ecoctrl/shared";

export const systemConfigApi = {
  get: () => get<SystemConfig>("/configs"),
  update: (data: Partial<SystemConfig>) => put<SystemConfig>("/configs", data),
};
