import { get, put } from "./request";
import type { MaintenanceReminder, MaintenanceReminderDetail } from "@ecoctrl/shared";

export const maintenanceApi = {
  reminders: {
    list: () => get<MaintenanceReminder[]>("/maintenance/reminders"),
    detail: (id: string) => get<MaintenanceReminderDetail>(`/maintenance/reminders/${id}`),
    update: (id: string, data: Partial<MaintenanceReminderDetail>) =>
      put<MaintenanceReminderDetail>(`/maintenance/reminders/${id}`, data),
  },
};
