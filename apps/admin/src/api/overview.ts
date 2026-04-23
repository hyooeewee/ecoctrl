import { get } from "./request";
import { Alert, BackupSchedule } from "../types";

export interface OverviewStats {
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

export const overviewApi = {
  stats: () => get<OverviewStats>("/overview/stats"),
  energyChart: () => get<EnergyChartPoint[]>("/overview/energy-chart"),
  alerts: (limit = 5) => get<Alert[]>("/alerts", { params: { limit: String(limit) } }),
  backupSchedule: () => get<BackupSchedule>("/system/backup-schedule"),
};
