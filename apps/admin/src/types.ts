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
  description?: string;
  status?: string;
  assignee?: string;
  location?: string;
  estimatedHours?: number;
  lastCompleted?: string;
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

export interface FaultStats {
  totalCount: number;
  trend: string;
  mttr: number;
  avgResponseTime: string;
}

export interface EnergyArea {
  title: string;
  current: number;
  target: number;
  color: string;
  powerFactor: number;
  loadRate: string;
}

export interface Model3D {
  id: string;
  name: string;
  version: string;
  format: string;
  size: string;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  docUrl?: string | null;
}

export interface ThreeDConfig {
  cameraPreset: string;
  ambientLightIntensity: number;
  hotspots?: unknown[];
  labels?: unknown[];
}

export interface SystemConfig {
  platformName: string;
  refreshInterval: number;
  realtimeAlertEnabled: boolean;
  theme: "light" | "dark" | "system";
  timezone: string;
  alertSound: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  autoBackup: boolean;
  backupRetentionDays: number;
  sessionTimeout: number;
}

export interface ReportTemplate {
  name: string;
  count: string;
  icon: string;
}

export interface BackupSchedule {
  nextBackup: string;
}

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  language?: "zh-CN" | "en-US";
  density?: "compact" | "comfortable" | "spacious";
  fontSize?: "small" | "medium" | "large";
  desktopNotification?: boolean;
  alertSound?: boolean;
  emailNotification?: boolean;
  sidebarCollapsed?: boolean;
  showBreadcrumb?: boolean;
}
