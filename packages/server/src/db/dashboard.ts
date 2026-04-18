import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DashboardStats, EnergyChartItem, Alert } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/dashboard.json");

interface DashboardData {
  stats: DashboardStats;
  energyChart: EnergyChartItem[];
  alerts: Alert[];
}

function loadData(): DashboardData {
  if (!fs.existsSync(DATA_FILE)) {
    return { stats: {} as DashboardStats, energyChart: [], alerts: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as DashboardData;
  } catch {
    return { stats: {} as DashboardStats, energyChart: [], alerts: [] };
  }
}

export function getDashboardStats(): DashboardStats {
  return loadData().stats;
}

export function getEnergyChart(): EnergyChartItem[] {
  return loadData().energyChart;
}

export function getAlerts(limit?: number): Alert[] {
  const alerts = loadData().alerts;
  if (limit && limit > 0) {
    return alerts.slice(0, limit);
  }
  return alerts;
}
