import type { DashboardData } from "~/lib/dashboard-api";

import { StatCardWidget } from "./_stat-card";
import type { DashboardWidget } from "./types";

export function RenewableWidget({ data }: { data: DashboardData | null }) {
  return <StatCardWidget data={data} titleKey="renewableRate" />;
}

export const renewableWidget: DashboardWidget = {
  id: "stat-renewableRate",
  title: (t) => t.bentoWidgets["stat-renewableRate"],
  defaultLayout: { x: 1, y: 5, w: 3, h: 2 },
  component: RenewableWidget,
};
