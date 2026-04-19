import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const DeltaVariantSchema = z.enum([
  "up-good",
  "up-bad",
  "down-good",
  "down-bad",
  "neutral",
]);
export type DeltaVariant = z.infer<typeof DeltaVariantSchema>;

export const ChartTypeSchema = z.enum(["area", "bar", "line", "progress"]);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export const DeviceCategorySchema = z.enum(["hvac", "lighting", "elevator", "server"]);
export type DeviceCategory = z.infer<typeof DeviceCategorySchema>;

export const DeviceStatusSchema = z.enum(["ok", "warn", "critical"]);
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;

export const AiCategorySchema = z.enum(["hvac", "lighting", "server"]);
export type AiCategory = z.infer<typeof AiCategorySchema>;

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

// ─── Dashboard Data ────────────────────────────────────────────────────────────
export const SparkPointSchema = z.object({ v: z.number() });
export type SparkPoint = z.infer<typeof SparkPointSchema>;

export const TrendPointSchema = z.object({ h: z.string(), kWh: z.number() });
export type TrendPoint = z.infer<typeof TrendPointSchema>;

export const BreakdownItemSchema = z.object({
  name: z.string(),
  value: z.number(),
  color: z.string(),
});
export type BreakdownItem = z.infer<typeof BreakdownItemSchema>;

export const DeviceStatusItemSchema = z.object({
  category: DeviceCategorySchema,
  count: z.number(),
  status: DeviceStatusSchema,
});
export type DeviceStatusItem = z.infer<typeof DeviceStatusItemSchema>;

export const AiSuggestionItemSchema = z.object({
  category: AiCategorySchema,
  text: z.string(),
  saving: z.string().optional(),
});
export type AiSuggestionItem = z.infer<typeof AiSuggestionItemSchema>;

export const DashboardCardSchema = z.object({
  titleKey: z.string(),
  value: z.string(),
  unit: z.string(),
  delta: z.string().optional(),
  deltaVariant: DeltaVariantSchema,
  chartType: ChartTypeSchema,
  chartData: z.array(SparkPointSchema),
  chartColor: z.string(),
  footerKey: z.string().optional(),
  progressValue: z.number().optional(),
});
export type DashboardCard = z.infer<typeof DashboardCardSchema>;

export const DashboardDataSchema = z.object({
  cards: z.array(DashboardCardSchema),
  trend: z.array(TrendPointSchema),
  breakdown: z.array(BreakdownItemSchema),
  devices: z.array(DeviceStatusItemSchema),
  aiSuggestions: z.array(AiSuggestionItemSchema),
  alerts: z.array(AlertSchema),
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
