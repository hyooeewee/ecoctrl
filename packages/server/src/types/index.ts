export interface FileMeta {
  id: string;
  name: string;
  filename: string;
}

export interface MaintenanceReminder {
  id: string;
  task: string;
  dueDate: string;
  priority: string;
}

export interface MaintenanceReminderDetail {
  id: string;
  task: string;
  description: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "overdue";
  assignee: string;
  location: string;
  estimatedHours: number;
  lastCompleted?: string;
}
