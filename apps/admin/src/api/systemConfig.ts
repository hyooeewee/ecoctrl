import { get, put } from "./request";
import { SystemConfig } from "../types";

export const systemConfigApi = {
  get: () => get<SystemConfig>("/configs"),
  update: (data: Partial<SystemConfig>) => put<SystemConfig>("/configs", data),
};
