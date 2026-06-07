import { get, put, request } from "./request";
import type { DashboardModelConfig } from "@ecoctrl/shared";

export const dashboardModelApi = {
  get: () => get<DashboardModelConfig>("/dashboard-model"),
  update: (data: Partial<DashboardModelConfig>) =>
    put<DashboardModelConfig>("/dashboard-model", data),
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DashboardModelConfig>("/dashboard-model", {
      method: "POST",
      body: form,
    });
  },
  uploadMultiple: (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("file", file));
    return request<DashboardModelConfig>("/dashboard-model", {
      method: "POST",
      body: form,
    });
  },
};
