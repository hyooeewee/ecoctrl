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
  DashboardData,
  WidgetConfig,
} from "@ecoctrl/shared";

export async function getDashboardStats(): Promise<DashboardStats> {
  const rows = await db.select().from(dashboardStats);
  const stats: Record<string, { value: string; unit: string; trend: string; trendType: "up" | "down" }> = {};
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

export async function getEnergyChart(): Promise<EnergyChartItem[]> {
  const rows = await db.select().from(energyReadings);
  return rows.map((r) => ({ name: r.hour, value: r.kWh }));
}

export async function getAlerts(limit?: number): Promise<Alert[]> {
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

export async function getDashboardData(): Promise<DashboardData> {
  const rows = await db
    .select()
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.enabled, true))
    .orderBy(asc(dashboardWidgets.sortOrder));

  const widgets: WidgetConfig[] = rows.map((r) => ({
    id: r.id,
    titleKey: r.titleKey,
    icon: r.icon,
    data: r.dataJson as WidgetConfig["data"],
  }));

  return { widgets };
}
