import { get, put } from "./request";
import type { DashboardModelConfig } from "@ecoctrl/shared";

export const dashboardModelApi = {
  get: () => get<DashboardModelConfig>("/dashboard-model"),
  update: (data: Partial<DashboardModelConfig>) =>
    put<DashboardModelConfig>("/dashboard-model", data),
};
