import { db } from "@/config/database";
import { dashboardStats } from "@/schemas/dashboard";
import { energyReadings } from "@/schemas/energy";
import { alerts } from "@/schemas/alerts";
import { dashboardWidgets } from "@/schemas/dashboardWidgets";
import { eq, asc } from "drizzle-orm";
import type {
  DashboardStats,
  EnergyChartItem,
  Alert,
  WidgetConfig,
  WidgetLayout,
} from "@ecoctrl/shared";
import { fetchWeather } from "@/services/weather";
import { findUserSettings } from "@/repositories/userSettings";

export async function findDashboardStats(): Promise<DashboardStats> {
  const rows = await db.select().from(dashboardStats);
  const stats: Record<
    string,
    { value: string; unit: string; trend: string; trendType: "up" | "down" }
  > = {};
  for (const r of rows) {
    stats[r.key] = {
      value: r.value,
      unit: r.unit,
      trend: r.trend,
      trendType: r.trendType as "up" | "down",
    };
  }
  // Cast through unknown to satisfy strict TS checking
  return stats as unknown as DashboardStats;
}

export async function findEnergyChart(): Promise<EnergyChartItem[]> {
  const rows = await db.select().from(energyReadings);
  return rows.map((r) => ({ name: r.hour, value: r.kWh }));
}

export async function findManyAlerts(limit?: number): Promise<Alert[]> {
  const rows = await db.select().from(alerts);
  const result = rows.map((r) => ({
    id: r.id,
    device: r.device,
    level: r.level as "high" | "medium" | "low",
    message: r.message,
    time: r.time,
    status: r.status as "pending" | "resolved",
  }));
  if (limit && limit > 0) {
    return result.slice(0, limit);
  }
  return result;
}

export async function findDashboardData(
  userId?: string,
): Promise<{ widgets: (WidgetConfig & { hidden: boolean; layout: WidgetLayout })[] }> {
  const rows = await db
    .select()
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.enabled, true))
    .orderBy(asc(dashboardWidgets.sortOrder));

  const userOverrides = new Map<
    string,
    { hidden?: boolean; x?: number; y?: number; w?: number; h?: number }
  >();

  if (userId) {
    const settings = await findUserSettings(userId);
    const bentoLayout =
      (settings.bentoLayout as
        | Array<{
            id: string;
            x?: number;
            y?: number;
            w?: number;
            h?: number;
            hidden?: boolean;
          }>
        | undefined) ?? [];

    for (const item of bentoLayout) {
      userOverrides.set(item.id, {
        hidden: item.hidden,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      });
    }
  }

  const widgets: (WidgetConfig & { hidden: boolean; layout: WidgetLayout })[] = [];

  for (const r of rows) {
    let data = r.dataJson as WidgetConfig["data"];

    if (r.dataType === "weather") {
      data = await fetchWeather();
    }

    const override = userOverrides.get(r.id);

    widgets.push({
      id: r.id,
      titleKey: r.titleKey,
      icon: r.icon,
      data,
      hidden: override?.hidden ?? r.hidden,
      layout: {
        x: override?.x ?? r.layoutX,
        y: override?.y ?? r.layoutY,
        w: override?.w ?? r.layoutW,
        h: override?.h ?? r.layoutH,
      },
    });
  }

  return { widgets };
}
