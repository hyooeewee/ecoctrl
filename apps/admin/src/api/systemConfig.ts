import { get, put } from "./request";
import { SystemConfig } from "../types";

export const systemConfigApi = {
  get: () => get<SystemConfig>("/api/config"),
  update: (data: Partial<SystemConfig>) => put<SystemConfig>("/api/config", data),
};
