import { get, put } from "./request";
import { SystemConfig } from "../types";

export const systemConfigApi = {
  get: () => get<SystemConfig>("/config"),
  update: (data: Partial<SystemConfig>) => put<SystemConfig>("/config", data),
};
