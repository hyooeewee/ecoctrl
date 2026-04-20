import type { DashboardData } from "~/components/dashboard/widgets/types";

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

export type {
  DashboardData,
  WidgetConfig,
  WidgetData,
  WidgetLayout,
} from "~/components/dashboard/widgets/types";
