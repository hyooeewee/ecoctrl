import { get } from "./request";
import { Alert, BackupSchedule } from "../types";

export interface DashboardStats {
  totalEnergy: { value: string; unit: string; trend: string; trendType: "up" | "down" | "neutral" };
  onlineRate: { value: string; unit: string; trend: string; trendType: "up" | "down" | "neutral" };
  pendingAlerts: {
    value: string;
    unit: string;
    trend: string;
    trendType: "up" | "down" | "neutral";
  };
  carbonEmission: {
    value: string;
    unit: string;
    trend: string;
    trendType: "up" | "down" | "neutral";
  };
}

export interface EnergyChartPoint {
  name: string;
  value: number;
}

export const dashboardApi = {
  stats: () => get<DashboardStats>("/api/dashboard/stats"),
  energyChart: () => get<EnergyChartPoint[]>("/api/dashboard/energy-chart"),
  alerts: (limit = 5) => get<Alert[]>("/api/alerts", { params: { limit: String(limit) } }),
  backupSchedule: () => get<BackupSchedule>("/api/system/backup-schedule"),
};
