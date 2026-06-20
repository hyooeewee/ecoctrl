// Widget system types — re-exports from shared package for backward compat.
// Prefer importing from "@ecoctrl/shared" for new code.

export type {
  WidgetConfig,
  WidgetDataJson,
  WidgetDataType,
  WidgetInitData,
  DashboardData,
  StatInitData,
  DonutInitData,
  TrendInitData,
  AlertInitData,
  DeviceInitData,
  SuggestionInitData,
  WeatherInitData,
  ChartPoint,
  ForecastItem,
  WidgetLayout,
} from "@ecoctrl/shared";

// ─── Legacy aliases (used by existing widget components) ──────────────────────

import type {
  WidgetInitData as _WidgetInitData,
  StatInitData as _StatInitData,
  DonutInitData as _DonutInitData,
  TrendInitData as _TrendInitData,
  AlertInitData as _AlertInitData,
  DeviceInitData as _DeviceInitData,
  SuggestionInitData as _SuggestionInitData,
  WeatherInitData as _WeatherInitData,
} from "@ecoctrl/shared";

/** @deprecated Use StatInitData */
export type StatData = _StatInitData;
/** @deprecated Use DonutInitData */
export type ChartData = _DonutInitData;
/** @deprecated Use AlertInitData | DeviceInitData | SuggestionInitData */
export type ListData = { items: Record<string, unknown>[] };
/** @deprecated Use WeatherInitData */
export type WeatherData = _WeatherInitData;
/** @deprecated Use WidgetInitData */
export type WidgetData = _WidgetInitData;
