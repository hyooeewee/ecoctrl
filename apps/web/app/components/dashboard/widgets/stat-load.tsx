import type { DashboardData } from "~/lib/dashboard-api";

import { StatCardWidget } from "./_stat-card";
import type { DashboardWidget } from "./types";

export function LoadWidget({ data }: { data: DashboardData }) {
  return <StatCardWidget data={data} titleKey="loadStatus" />;
}

export const loadWidget: DashboardWidget = {
  id: "stat-loadStatus",
  title: (t) => t.bentoWidgets["stat-loadStatus"],
  defaultLayout: { x: 4, y: 5, w: 3, h: 2 },
  component: LoadWidget,
};
