import type { DashboardData } from "~/lib/dashboard-api";

import { StatCardWidget } from "./_stat-card";
import type { DashboardWidget } from "./types";

export function IntensityWidget({ data }: { data: DashboardData | null }) {
  return <StatCardWidget data={data} titleKey="energyIntensity" />;
}

export const intensityWidget: DashboardWidget = {
  id: "stat-energyIntensity",
  title: (t) => t.bentoWidgets["stat-energyIntensity"],
  defaultLayout: { x: 1, y: 3, w: 3, h: 2 },
  component: IntensityWidget,
};
