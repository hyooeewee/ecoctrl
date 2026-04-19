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

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
}

export interface DashboardStatItem {
  value: string;
  unit: string;
  trend: string;
  trendType: "up" | "down";
}

export interface DashboardStats {
  totalEnergy: DashboardStatItem;
  onlineRate: DashboardStatItem;
  pendingAlerts: DashboardStatItem;
  carbonEmission: DashboardStatItem;
}

export interface EnergyChartItem {
  name: string;
  value: number;
}

export interface Alert {
  id: string;
  device: string;
  level: "high" | "medium" | "low";
  message: string;
  time: string;
  status: "pending" | "resolved";
}

export interface ReportPlan {
  id: string;
  name: string;
  receiver: string;
  frequency: string;
  status: boolean;
}

export interface SparkPoint {
  v: number;
}

export interface TrendPoint {
  h: string;
  kWh: number;
}

export interface BreakdownItem {
  name: string;
  value: number;
  color: string;
}

export type DeltaVariant = "up-good" | "up-bad" | "down-good" | "down-bad" | "neutral";
export type ChartType = "area" | "bar" | "line" | "progress";

export interface DashboardCard {
  titleKey: string;
  value: string;
  unit: string;
  delta?: string;
  deltaVariant: DeltaVariant;
  chartType: ChartType;
  chartData: SparkPoint[];
  chartColor: string;
  footerKey?: string;
  progressValue?: number;
}

export interface DashboardData {
  cards: DashboardCard[];
  trend: TrendPoint[];
  breakdown: BreakdownItem[];
}
