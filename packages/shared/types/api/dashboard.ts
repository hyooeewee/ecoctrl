import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const DeltaVariantSchema = z.enum(["up-good", "up-bad", "down-good", "down-bad", "neutral"]);
export type DeltaVariant = z.infer<typeof DeltaVariantSchema>;

export const AlertLevelSchema = z.enum(["high", "medium", "low"]);
export type AlertLevel = z.infer<typeof AlertLevelSchema>;

export const AlertStatusSchema = z.enum(["pending", "resolved"]);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

// ─── Alerts ────────────────────────────────────────────────────────────────────
export const AlertSchema = z.object({
  id: z.string(),
  device: z.string(),
  level: AlertLevelSchema,
  message: z.string(),
  time: z.string(),
  status: AlertStatusSchema,
});
export type Alert = z.infer<typeof AlertSchema>;

// ─── Layout ────────────────────────────────────────────────────────────────────
export const WidgetLayoutSchema = z.object({
  x: z.number().int().min(1),
  y: z.number().int().min(1),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
});
export type WidgetLayout = z.infer<typeof WidgetLayoutSchema>;

// ─── Init Data Shapes (SSE data must match these exactly) ─────────────────────

/** Stat card initial/live data */
export const StatInitDataSchema = z.object({
  value: z.string(),
  trend: z.string().optional(),
  sparkline: z.array(z.number()).optional(),
});
export type StatInitData = z.infer<typeof StatInitDataSchema>;

/** Chart data point */
export const ChartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});
export type ChartPoint = z.infer<typeof ChartPointSchema>;

/** Donut chart initial/live data */
export const DonutInitDataSchema = z.object({
  total: z.number(),
  items: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      color: z.string().optional(),
    }),
  ),
});
export type DonutInitData = z.infer<typeof DonutInitDataSchema>;

/** Trend chart (area/line/bar) initial/live data */
export const TrendInitDataSchema = z.object({
  points: z.array(ChartPointSchema),
});
export type TrendInitData = z.infer<typeof TrendInitDataSchema>;

/** Alert list initial/live data */
export const AlertInitDataSchema = z.object({
  items: z.array(
    z.object({
      icon: z.string(),
      title: z.string(),
      subtitle: z.string(),
      severity: z.enum(["critical", "warning", "info"]),
      time: z.string(),
    }),
  ),
});
export type AlertInitData = z.infer<typeof AlertInitDataSchema>;

/** Device list initial/live data */
export const DeviceInitDataSchema = z.object({
  items: z.array(
    z.object({
      icon: z.string(),
      label: z.string(),
      value: z.number(),
      status: z.enum(["ok", "warn", "critical"]),
    }),
  ),
});
export type DeviceInitData = z.infer<typeof DeviceInitDataSchema>;

/** AI suggestions initial/live data */
export const SuggestionInitDataSchema = z.object({
  items: z.array(
    z.object({
      icon: z.string(),
      text: z.string(),
      saving: z.string().optional(),
    }),
  ),
});
export type SuggestionInitData = z.infer<typeof SuggestionInitDataSchema>;

/** Weather initial/live data */
export const ForecastItemSchema = z.object({
  day: z.string(),
  high: z.number(),
  low: z.number(),
  condition: z.string(),
});
export type ForecastItem = z.infer<typeof ForecastItemSchema>;

export const WeatherInitDataSchema = z.object({
  location: z.string(),
  currentTemp: z.number(),
  unit: z.enum(["C", "F"]),
  condition: z.string(),
  forecast: z.array(ForecastItemSchema),
});
export type WeatherInitData = z.infer<typeof WeatherInitDataSchema>;

/** Union of all init data shapes (matches SSE data payloads) */
export const WidgetInitDataSchema = z.union([
  StatInitDataSchema,
  DonutInitDataSchema,
  TrendInitDataSchema,
  AlertInitDataSchema,
  DeviceInitDataSchema,
  SuggestionInitDataSchema,
  WeatherInitDataSchema,
]);
export type WidgetInitData = z.infer<typeof WidgetInitDataSchema>;

// ─── Widget dataJson (renderConfig flat + initData sub-object) ────────────────

/** dataJson structure: flat config fields + initData */
export interface WidgetDataJson {
  /** Chart type for chart widgets (donut, area, line, bar) */
  chartType?: "donut" | "area" | "line" | "bar";
  /** Unit label for stat widgets */
  unit?: string;
  /** Sparkline line color for stat widgets */
  sparklineColor?: string;
  /** Locale key for stat widget footer text */
  footerKey?: string;
  /** Whether an increase is "good" or "bad" for stat widgets */
  trendDirection?: "good" | "bad";
  /** Initial data — SSE data must match this structure exactly */
  initData: WidgetInitData;
}

// ─── Widget Config ─────────────────────────────────────────────────────────────

export type WidgetDataType = "stat" | "chart" | "list" | "weather";

export interface WidgetConfig {
  id: string;
  metricKey: string;
  icon: string;
  dataType: WidgetDataType;
  dataJson: WidgetDataJson;
  hidden: boolean;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
}

// ─── Dashboard Data ────────────────────────────────────────────────────────────
export interface DashboardData {
  widgets: WidgetConfig[];
}

// ─── Stats ─────────────────────────────────────────────────────────────────────
export const DashboardStatItemSchema = z.object({
  value: z.string(),
  unit: z.string(),
  trend: z.string(),
  trendType: z.enum(["up", "down"]),
});
export type DashboardStatItem = z.infer<typeof DashboardStatItemSchema>;

export const DashboardStatsSchema = z.object({
  totalEnergy: DashboardStatItemSchema,
  onlineRate: DashboardStatItemSchema,
  pendingAlerts: DashboardStatItemSchema,
  carbonEmission: DashboardStatItemSchema,
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// ─── Energy Chart ──────────────────────────────────────────────────────────────
export const EnergyChartItemSchema = z.object({
  name: z.string(),
  value: z.number(),
});
export type EnergyChartItem = z.infer<typeof EnergyChartItemSchema>;

// ─── SSE Widget Payload ────────────────────────────────────────────────────────
export interface SSEWidgetPayload {
  metricKey: string;
  timestamp: number;
  data: WidgetInitData;
}

// ─── Backward compat aliases ───────────────────────────────────────────────────
/** @deprecated Use StatInitData */
export type StatData = StatInitData;
/** @deprecated Use WidgetInitData */
export type WidgetData = WidgetInitData;
