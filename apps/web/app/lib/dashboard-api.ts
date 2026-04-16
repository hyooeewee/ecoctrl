import { apiGet } from "~/lib/api";
import {
  CARD_VALUES,
  CARBON_DATA,
  COST_DATA,
  ENERGY_DATA,
  INTENSITY_DATA,
  LOAD_DATA,
  RENEWABLE_DATA,
} from "~/lib/api.mock";

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

export interface DashboardCard {
  titleKey: string;
  value: string;
  unit: string;
  delta?: string;
  deltaVariant: "up-good" | "up-bad" | "down-good" | "down-bad" | "neutral";
  chartType: "area" | "bar" | "line" | "progress";
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

// Placeholder endpoint
const DASHBOARD_ENDPOINT = "/dashboard";

export async function fetchDashboardData(): Promise<DashboardData> {
  const res = await apiGet<DashboardData>(DASHBOARD_ENDPOINT);

  if (res.ok && res.data) {
    return res.data;
  }

  // Fallback to mock data so the UI never breaks
  return getMockDashboardData();
}

export function getMockDashboardData(): DashboardData {
  return {
    cards: [
      {
        titleKey: "totalEnergy",
        value: CARD_VALUES.totalEnergy.value,
        delta: CARD_VALUES.totalEnergy.delta,
        deltaVariant: CARD_VALUES.totalEnergy.deltaVariant,
        unit: "kWh",
        chartType: "area",
        chartData: ENERGY_DATA,
        chartColor: "var(--color-chart-1)",
        footerKey: "totalEnergyFooter",
      },
      {
        titleKey: "carbonEmission",
        value: CARD_VALUES.carbonEmission.value,
        delta: CARD_VALUES.carbonEmission.delta,
        deltaVariant: CARD_VALUES.carbonEmission.deltaVariant,
        unit: "kg CO₂",
        chartType: "bar",
        chartData: CARBON_DATA,
        chartColor: "var(--color-chart-2)",
        footerKey: "carbonFooter",
      },
      {
        titleKey: "energyIntensity",
        value: CARD_VALUES.energyIntensity.value,
        delta: CARD_VALUES.energyIntensity.delta,
        deltaVariant: CARD_VALUES.energyIntensity.deltaVariant,
        unit: "kWh/m²",
        chartType: "line",
        chartData: INTENSITY_DATA,
        chartColor: "var(--color-chart-1)",
        footerKey: "intensityFooter",
      },
      {
        titleKey: "todayCost",
        value: CARD_VALUES.todayCost.value,
        delta: CARD_VALUES.todayCost.delta,
        deltaVariant: CARD_VALUES.todayCost.deltaVariant,
        unit: "costUnit",
        chartType: "area",
        chartData: COST_DATA,
        chartColor: "var(--color-chart-4)",
        footerKey: "costFooter",
      },
      {
        titleKey: "renewableRate",
        value: CARD_VALUES.renewableRate.value,
        deltaVariant: CARD_VALUES.renewableRate.deltaVariant,
        unit: "%",
        delta: "renewableTarget",
        chartType: "progress",
        chartData: RENEWABLE_DATA,
        chartColor: "var(--color-cyber-green)",
        progressValue: CARD_VALUES.renewableRate.progressValue,
      },
      {
        titleKey: "loadStatus",
        value: CARD_VALUES.loadStatus.value,
        deltaVariant: CARD_VALUES.loadStatus.deltaVariant,
        unit: "%",
        delta: "loadNormal",
        chartType: "progress",
        chartData: LOAD_DATA,
        chartColor: "var(--color-chart-2)",
        progressValue: CARD_VALUES.loadStatus.progressValue,
      },
    ],
    trend: [
      { h: "00", kWh: 180 },
      { h: "02", kWh: 145 },
      { h: "04", kWh: 120 },
      { h: "06", kWh: 160 },
      { h: "08", kWh: 310 },
      { h: "10", kWh: 420 },
      { h: "12", kWh: 480 },
      { h: "14", kWh: 460 },
      { h: "16", kWh: 440 },
      { h: "18", kWh: 410 },
      { h: "20", kWh: 360 },
      { h: "24", kWh: 280 },
    ],
    breakdown: [
      { name: "hvac", value: 45, color: "var(--color-chart-1)" },
      { name: "lighting", value: 30, color: "var(--color-chart-3)" },
      { name: "equipment", value: 15, color: "var(--color-chart-4)" },
      { name: "other", value: 10, color: "oklch(0.35 0.02 265)" },
    ],
  };
}
