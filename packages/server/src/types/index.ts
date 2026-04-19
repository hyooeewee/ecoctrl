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

export interface Fault {
  id: string;
  device: string;
  level: "严重" | "一般" | "提示";
  time: string;
  status: "待处理" | "维保中" | "已修复";
}

export interface FaultStats {
  totalCount: number;
  trend: string;
  mttr: number;
  avgResponseTime: string;
}

export interface ReportPlan {
  id: string;
  name: string;
  receiver: string;
  frequency: string;
  status: boolean;
}

export type {
  DashboardStats,
  EnergyChartItem,
  Alert,
  DashboardCard,
  DashboardData,
  TrendPoint,
  BreakdownItem,
  DeviceStatusItem,
  AiSuggestionItem,
  DashboardStatItem,
  DeltaVariant,
  ChartType,
} from "@ecoctrl/shared";
