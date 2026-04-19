import type { DashboardData } from "~/lib/dashboard-api";

import { StatCardWidget } from "./_stat-card";
import type { DashboardWidget } from "./types";

export function TotalEnergyWidget({ data }: { data: DashboardData }) {
  return <StatCardWidget data={data} titleKey="totalEnergy" />;
}

export const totalEnergyWidget: DashboardWidget = {
  id: "stat-totalEnergy",
  title: (t) => t.bentoWidgets["stat-totalEnergy"],
  defaultLayout: { x: 1, y: 1, w: 3, h: 2 },
  component: TotalEnergyWidget,
};
