import { BentoItem } from "~/components/dashboard/bento-grid";
import type { DashboardData } from "~/lib/dashboard-api";

import { WidgetRenderer } from "./widget-renderer";

interface DashboardWidgetsProps {
  data: DashboardData | null;
}

export function DashboardWidgets({ data }: DashboardWidgetsProps) {
  const widgets = data?.widgets ?? [];
  return (
    <>
      {widgets.map((widget) => (
        <BentoItem key={widget.id} id={widget.id}>
          <WidgetRenderer widget={widget} />
        </BentoItem>
      ))}
    </>
  );
}

export type { DashboardData, WidgetConfig, WidgetData, WidgetLayout } from "./types";
