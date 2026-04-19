import type { DashboardData } from "~/lib/dashboard-api";

export interface WidgetDefaultLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  // Returns the display name for the widget (used in settings page)
  title: (t: { bentoWidgets: Record<string, string> }) => string;
  defaultLayout: WidgetDefaultLayout;
  component: React.FC<{ data: DashboardData | null }>;
}
