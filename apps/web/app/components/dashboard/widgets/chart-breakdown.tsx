import type { DashboardData } from "~/lib/dashboard-api";

import { EnergyBreakdownChart } from "./energy-charts";
import type { DashboardWidget } from "./types";

export function BreakdownWidget({ data }: { data: DashboardData }) {
  return <EnergyBreakdownChart data={data.breakdown} />;
}

export const breakdownWidget: DashboardWidget = {
  id: "chart-breakdown",
  title: (t) => t.bentoWidgets["chart-breakdown"],
  defaultLayout: { x: 7, y: 7, w: 4, h: 2 },
  component: BreakdownWidget,
};
