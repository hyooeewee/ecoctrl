import type {
  BreakdownItem,
  DashboardCard,
  DashboardData,
  DeviceStatusItem,
  AiSuggestionItem,
  SparkPoint,
  TrendPoint,
} from "@ecoctrl/shared";

export type {
  BreakdownItem,
  DashboardCard,
  DashboardData,
  DeviceStatusItem,
  AiSuggestionItem,
  SparkPoint,
  TrendPoint,
};

import { apiGet } from "~/lib/api";

const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? "";
const DASHBOARD_ENDPOINT = `${API_PREFIX}/dashboard`;

export async function fetchDashboardData(): Promise<DashboardData | null> {
  const res = await apiGet<DashboardData>(DASHBOARD_ENDPOINT);

  if (res.ok && res.data) {
    return res.data;
  }

  return null;
}
