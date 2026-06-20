import { BentoItem } from "~/components/dashboard/bento-grid";
import type { DashboardData } from "~/lib/dashboard-api";
import { useWidgetDataStore } from "~/store/widgetData";

import type { WidgetInitData } from "./types";
import { WidgetRenderer } from "./widget-renderer";

interface DashboardWidgetsProps {
  data: DashboardData | null;
}

export function DashboardWidgets({ data }: DashboardWidgetsProps) {
  const widgets = data?.widgets ?? [];
  const entries = useWidgetDataStore((state) => state.entries);

  return (
    <>
      {widgets.map((widget) => (
        <BentoItem key={widget.id} id={widget.id}>
          <WidgetRenderer
            widget={widget}
            liveData={entries[widget.metricKey]?.liveData as unknown as WidgetInitData | undefined}
          />
        </BentoItem>
      ))}
    </>
  );
}

export type { DashboardData, WidgetConfig, WidgetInitData, WidgetLayout } from "./types";
