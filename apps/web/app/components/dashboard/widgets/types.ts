// Widget system types — aligned with backend JSON contract
// Backend controls: id, metricKey, icon, layout, data
// Frontend controls: rendering based on data shape

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Data shapes (discriminated by content, not a type field) ─────────────────

export interface StatData {
  value: string;
  unit: string;
  delta?: string;
  deltaVariant: "up-good" | "up-bad" | "down-good" | "down-bad" | "neutral";
  sparkline?: number[];
  sparklineColor?: string;
  footerKey?: string;
  progressValue?: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ChartData {
  chartType?: "area" | "line" | "bar" | "donut";
  total?: number;
  points?: ChartPoint[];
  items?: { label: string; value: number; color?: string }[];
}

export interface ListData {
  items: Record<string, unknown>[];
}

export interface ForecastItem {
  day: string;
  high: number;
  low: number;
  condition: string;
}

export interface WeatherData {
  location: string;
  currentTemp: number;
  unit: string;
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  forecast: ForecastItem[];
}

export type WidgetData = StatData | ChartData | ListData | WeatherData;

// ─── Widget Config (from backend) ─────────────────────────────────────────────

export interface WidgetConfig {
  id: string;
  metricKey: string;
  icon: string;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  hidden: boolean;
  data: WidgetData;
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

export interface DashboardData {
  widgets: WidgetConfig[];
}
