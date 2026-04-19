import { BentoItem } from "~/components/dashboard/bento-grid";
import type { DashboardData } from "~/lib/dashboard-api";

import { allWidgets } from "./registry";

interface DashboardWidgetsProps {
  data: DashboardData;
}

export function DashboardWidgets({ data }: DashboardWidgetsProps) {
  return (
    <>
      {allWidgets.map((widget) => (
        <BentoItem key={widget.id} id={widget.id}>
          <widget.component data={data} />
        </BentoItem>
      ))}
    </>
  );
}

export { allWidgets, buildDefaultBentoLayout } from "./registry";
export type { DashboardWidget, WidgetDefaultLayout } from "./types";
