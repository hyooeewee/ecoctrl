import type { DashboardData } from "~/lib/dashboard-api";

import { StatCardWidget } from "./_stat-card";
import type { DashboardWidget } from "./types";

export function CarbonWidget({ data }: { data: DashboardData | null }) {
  return <StatCardWidget data={data} titleKey="carbonEmission" />;
}

export const carbonWidget: DashboardWidget = {
  id: "stat-carbonEmission",
  title: (t) => t.bentoWidgets["stat-carbonEmission"],
  defaultLayout: { x: 4, y: 1, w: 3, h: 2 },
  component: CarbonWidget,
};
