import { get, put } from "./request";
import { MaintenanceReminder } from "../types";

export const maintenanceApi = {
  reminders: {
    list: () => get<MaintenanceReminder[]>("/api/maintenance/reminders"),
    detail: (id: string) => get<MaintenanceReminder>(`/api/maintenance/reminders/${id}`),
    update: (id: string, data: Partial<MaintenanceReminder>) =>
      put<MaintenanceReminder>(`/api/maintenance/reminders/${id}`, data),
  },
};
