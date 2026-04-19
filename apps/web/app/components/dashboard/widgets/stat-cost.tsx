import type { DashboardData } from "~/lib/dashboard-api";

import { StatCardWidget } from "./_stat-card";
import type { DashboardWidget } from "./types";

export function CostWidget({ data }: { data: DashboardData | null }) {
  return <StatCardWidget data={data} titleKey="todayCost" />;
}

export const costWidget: DashboardWidget = {
  id: "stat-todayCost",
  title: (t) => t.bentoWidgets["stat-todayCost"],
  defaultLayout: { x: 4, y: 3, w: 3, h: 2 },
  component: CostWidget,
};
