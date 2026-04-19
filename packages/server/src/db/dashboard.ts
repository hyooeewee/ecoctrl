import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/paths";
import type { DashboardStats, EnergyChartItem, Alert, DashboardData } from "@/types/index";

const DATA_FILE = path.join(DATA_DIR, "dashboard.json");

interface PersistedDashboardData {
  stats: DashboardStats;
  energyChart: EnergyChartItem[];
  alerts: Alert[];
}

function loadData(): PersistedDashboardData {
  if (!fs.existsSync(DATA_FILE)) {
    return { stats: {} as DashboardStats, energyChart: [], alerts: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PersistedDashboardData;
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

export function getDashboardData(): DashboardData {
  return {
    cards: [
      {
        titleKey: "totalEnergy",
        value: "8,456",
        unit: "kWh",
        delta: "+12%",
        deltaVariant: "up-bad",
        chartType: "area",
        chartData: [{ v: 280 }, { v: 310 }, { v: 295 }, { v: 340 }, { v: 380 }, { v: 420 }, { v: 395 }, { v: 440 }, { v: 410 }, { v: 460 }, { v: 480 }, { v: 500 }],
        chartColor: "var(--color-chart-1)",
        footerKey: "totalEnergyFooter",
      },
      {
        titleKey: "carbonEmission",
        value: "2,340",
        unit: "kg CO₂",
        delta: "+2%",
        deltaVariant: "up-bad",
        chartType: "bar",
        chartData: [{ v: 280 }, { v: 320 }, { v: 290 }, { v: 350 }, { v: 310 }, { v: 270 }, { v: 340 }],
        chartColor: "var(--color-chart-2)",
        footerKey: "carbonFooter",
      },
      {
        titleKey: "energyIntensity",
        value: "98",
        unit: "kWh/m²",
        delta: "−7%",
        deltaVariant: "down-good",
        chartType: "line",
        chartData: [{ v: 120 }, { v: 115 }, { v: 112 }, { v: 108 }, { v: 105 }, { v: 103 }, { v: 100 }, { v: 99 }, { v: 97 }, { v: 96 }, { v: 97 }, { v: 98 }],
        chartColor: "var(--color-chart-1)",
        footerKey: "intensityFooter",
      },
      {
        titleKey: "todayCost",
        value: "5,240",
        unit: "costUnit",
        delta: "+8%",
        deltaVariant: "up-bad",
        chartType: "area",
        chartData: [{ v: 180 }, { v: 210 }, { v: 195 }, { v: 240 }, { v: 280 }, { v: 310 }, { v: 290 }, { v: 330 }, { v: 350 }, { v: 370 }, { v: 385 }, { v: 400 }],
        chartColor: "var(--color-chart-4)",
        footerKey: "costFooter",
      },
      {
        titleKey: "renewableRate",
        value: "85",
        unit: "%",
        deltaVariant: "neutral",
        delta: "renewableTarget",
        chartType: "progress",
        chartData: [{ v: 78 }, { v: 80 }, { v: 81 }, { v: 80 }, { v: 82 }, { v: 84 }, { v: 83 }, { v: 85 }, { v: 84 }, { v: 86 }, { v: 85 }, { v: 85 }],
        chartColor: "var(--color-cyber-green)",
        progressValue: 85,
      },
      {
        titleKey: "loadStatus",
        value: "60",
        unit: "%",
        deltaVariant: "up-good",
        delta: "loadNormal",
        chartType: "progress",
        chartData: [{ v: 55 }, { v: 58 }, { v: 60 }, { v: 63 }, { v: 61 }, { v: 60 }, { v: 58 }, { v: 59 }, { v: 60 }, { v: 62 }, { v: 61 }, { v: 60 }],
        chartColor: "var(--color-chart-2)",
        progressValue: 60,
      },
    ],
    trend: [
      { h: "00", kWh: 180 }, { h: "02", kWh: 145 }, { h: "04", kWh: 120 },
      { h: "06", kWh: 160 }, { h: "08", kWh: 310 }, { h: "10", kWh: 420 },
      { h: "12", kWh: 480 }, { h: "14", kWh: 460 }, { h: "16", kWh: 440 },
      { h: "18", kWh: 410 }, { h: "20", kWh: 360 }, { h: "22", kWh: 280 },
    ],
    breakdown: [
      { name: "hvac", value: 45, color: "var(--color-chart-1)" },
      { name: "lighting", value: 30, color: "var(--color-chart-3)" },
      { name: "equipment", value: 15, color: "var(--color-chart-4)" },
      { name: "other", value: 10, color: "oklch(0.35 0.02 265)" },
    ],
  };
}
