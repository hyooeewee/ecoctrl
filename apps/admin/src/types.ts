export interface NavItem {
  id: string;
  label: string;
  icon: any;
}

export interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
}

export interface Alert {
  id: string;
  device: string;
  level: "high" | "medium" | "low";
  message: string;
  time: string;
  status: "pending" | "resolved";
}

export interface MaintenanceReminder {
  id: string;
  task: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
}

export interface ReportPlan {
  id: string;
  name: string;
  receiver: string;
  frequency: string;
  status: boolean;
}

export interface Fault {
  id: string;
  device: string;
  level: string;
  time: string;
  status: string;
}
