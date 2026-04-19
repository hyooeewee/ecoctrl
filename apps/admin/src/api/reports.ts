import { get, post, put } from "./request";
import { ReportPlan, ReportTemplate } from "../types";

export const reportsApi = {
  plans: {
    list: () => get<ReportPlan[]>("/api/reports/plans"),
    create: (data: Omit<ReportPlan, "id">) => post<ReportPlan>("/api/reports/plans", data),
    update: (id: string, data: Partial<ReportPlan>) =>
      put<ReportPlan>(`/api/reports/plans/${id}`, data),
  },
  templates: () => get<ReportTemplate[]>("/api/reports/templates"),
};
