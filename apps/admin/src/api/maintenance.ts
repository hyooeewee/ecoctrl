import { get, put } from "./request";
import { MaintenanceReminder } from "../types";

export const maintenanceApi = {
  reminders: {
    list: () => get<MaintenanceReminder[]>("/maintenance/reminders"),
    detail: (id: string) => get<MaintenanceReminder>(`/maintenance/reminders/${id}`),
    update: (id: string, data: Partial<MaintenanceReminder>) =>
      put<MaintenanceReminder>(`/maintenance/reminders/${id}`, data),
  },
};
