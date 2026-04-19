import { apiGet } from "~/lib/api";

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

const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? "";
const DASHBOARD_ENDPOINT = `${API_PREFIX}/dashboard`;

export async function fetchDashboardData(): Promise<DashboardData | null> {
  const res = await apiGet<DashboardData>(DASHBOARD_ENDPOINT);

  if (res.ok && res.data) {
    return res.data;
  }

  return null;
}
