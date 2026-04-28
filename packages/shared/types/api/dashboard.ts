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

// ─── Data Shapes ───────────────────────────────────────────────────────────────
// 1. Stat card data
export const StatDataSchema = z.object({
  value: z.string(),
  unit: z.string(),
  delta: z.string().optional(),
  deltaVariant: z.enum(["up-good", "up-bad", "down-good", "down-bad", "neutral"]),
  sparkline: z.array(z.number()).optional(),
  sparklineColor: z.string().optional(),
  footerKey: z.string().optional(),
  progressValue: z.number().optional(),
});
export type StatData = z.infer<typeof StatDataSchema>;

// 2. Chart data
export const ChartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});
export type ChartPoint = z.infer<typeof ChartPointSchema>;

export const ChartDataSchema = z.object({
  chartType: z.enum(["area", "line", "bar", "donut"]),
  points: z.array(ChartPointSchema).optional(), // area/line/bar
  items: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        color: z.string(),
      }),
    )
    .optional(), // donut
});
export type ChartData = z.infer<typeof ChartDataSchema>;

// 3. List data
export const ListDataSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
});
export type ListData = z.infer<typeof ListDataSchema>;

// 4. Weather data
export const ForecastItemSchema = z.object({
  day: z.string(),
  high: z.number(),
  low: z.number(),
  condition: z.string(),
});
export type ForecastItem = z.infer<typeof ForecastItemSchema>;

export const WeatherDataSchema = z.object({
  location: z.string(),
  currentTemp: z.number(),
  unit: z.enum(["C", "F"]),
  condition: z.string(),
  forecast: z.array(ForecastItemSchema),
});
export type WeatherData = z.infer<typeof WeatherDataSchema>;

// ─── Widget Config ─────────────────────────────────────────────────────────────
export const WidgetDataSchema = z.union([
  StatDataSchema,
  ChartDataSchema,
  ListDataSchema,
  WeatherDataSchema,
]);
export type WidgetData = z.infer<typeof WidgetDataSchema>;

export const WidgetConfigSchema = z.object({
  id: z.string().uuid(),
  titleKey: z.string(),
  icon: z.string(),
  data: WidgetDataSchema,
});
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>;

// ─── Dashboard Data ────────────────────────────────────────────────────────────
export const DashboardDataSchema = z.object({
  widgets: z.array(WidgetConfigSchema),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;

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
