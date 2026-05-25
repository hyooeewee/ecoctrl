import { BentoItem } from "~/components/dashboard/bento-grid";
import type { DashboardData } from "~/lib/dashboard-api";
import { useWidgetDataStore } from "~/store/widgetData";

import type { WidgetData } from "./types";
import { WidgetRenderer } from "./widget-renderer";

interface DashboardWidgetsProps {
  data: DashboardData | null;
}

export function DashboardWidgets({ data }: DashboardWidgetsProps) {
  const widgets = data?.widgets ?? [];
  const sseDataMap = useWidgetDataStore((state) => state.dataMap);

  return (
    <>
      {widgets.map((widget) => (
        <BentoItem key={widget.id} id={widget.id}>
          <WidgetRenderer
            widget={widget}
            liveData={sseDataMap[widget.id] as unknown as WidgetData | undefined}
          />
        </BentoItem>
      ))}
    </>
  );
}

export type { DashboardData, WidgetConfig, WidgetData, WidgetLayout } from "./types";
