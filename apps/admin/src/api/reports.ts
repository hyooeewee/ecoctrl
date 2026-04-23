import { get, post, put } from "./request";
import { ReportPlan, ReportTemplate } from "../types";

export const reportsApi = {
  plans: {
    list: () => get<ReportPlan[]>("/reports/plans"),
    create: (data: Omit<ReportPlan, "id">) => post<ReportPlan>("/reports/plans", data),
    update: (id: string, data: Partial<ReportPlan>) =>
      put<ReportPlan>(`/reports/plans/${id}`, data),
  },
  templates: () => get<ReportTemplate[]>("/reports/templates"),
};
