import { db } from "@/config/database";
import { energyReadings } from "@/schemas/energy";
import { alerts } from "@/schemas/alerts";
import { objects } from "@/schemas/objects";
import { dashboardWidgets } from "@/schemas/dashboardWidgets";
import { eq, asc, sql } from "drizzle-orm";
import type { DashboardStats, EnergyChartItem, Alert, WidgetConfig } from "@ecoctrl/shared";
import { fetchWeather } from "@/services/weather";
import { findUserSettings } from "@/repositories/userSettings";
import { emitWidgetUpdate } from "@/lib/widgetPublisher";

// Grid carbon emission factor: ~0.785 kg CO₂/kWh (China average)
const CARBON_FACTOR = 0.785;

export async function findDashboardStats(): Promise<DashboardStats> {
  const [energyResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${energyReadings.kWh}), 0)` })
    .from(energyReadings);
  const totalEnergy = energyResult?.total ?? 0;

  const [totalObjectsResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(objects);
  const [onlineObjectsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(objects)
    .where(eq(objects.status, "online"));
  const totalObjCount = totalObjectsResult?.count ?? 0;
  const onlineObjCount = onlineObjectsResult?.count ?? 0;
  const onlineRate = totalObjCount > 0 ? (onlineObjCount / totalObjCount) * 100 : 0;

  const [alertResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(alerts)
    .where(eq(alerts.status, "pending"));
  const pendingAlerts = alertResult?.count ?? 0;

  const carbonEmission = Math.round(totalEnergy * CARBON_FACTOR);

  // TODO: Compute real trends from historical business data once we have
  // multi-period readings in energyReadings / objects / alerts.
  const stats: DashboardStats = {
    totalEnergy: {
      value: totalEnergy.toLocaleString(),
      unit: "kWh",
      trend: "+12%",
      trendType: "up",
    },
    onlineRate: {
      value: onlineRate.toFixed(1),
      unit: "%",
      trend: "+0.5%",
      trendType: "up",
    },
    pendingAlerts: {
      value: pendingAlerts.toString().padStart(2, "0"),
      unit: "项",
      trend: "-2",
      trendType: "down",
    },
    carbonEmission: {
      value: carbonEmission.toLocaleString(),
      unit: "kg",
      trend: "-4.2%",
      trendType: "down",
    },
  };

  // Emit SSE widget update events for each stat
  await emitWidgetUpdate("energy-total", "stat", {
    value: stats.totalEnergy.value,
    unit: stats.totalEnergy.unit,
    trend: stats.totalEnergy.trend,
    trendType: stats.totalEnergy.trendType,
  });
  await emitWidgetUpdate("online-rate", "stat", {
    value: stats.onlineRate.value,
    unit: stats.onlineRate.unit,
    trend: stats.onlineRate.trend,
    trendType: stats.onlineRate.trendType,
  });
  await emitWidgetUpdate("pending-alerts", "stat", {
    value: stats.pendingAlerts.value,
    unit: stats.pendingAlerts.unit,
    trend: stats.pendingAlerts.trend,
    trendType: stats.pendingAlerts.trendType,
  });
  await emitWidgetUpdate("carbon-emission", "stat", {
    value: stats.carbonEmission.value,
    unit: stats.carbonEmission.unit,
    trend: stats.carbonEmission.trend,
    trendType: stats.carbonEmission.trendType,
  });

  return stats as unknown as DashboardStats;
}

export async function findEnergyChart(): Promise<EnergyChartItem[]> {
  const rows = await db.select().from(energyReadings);
  const chartData = rows.map((r) => ({ name: r.hour, value: r.kWh }));

  await emitWidgetUpdate("energy-chart", "chart", {
    data: chartData,
  });

  return chartData;
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

  await emitWidgetUpdate("alerts-list", "list", {
    items: limit && limit > 0 ? result.slice(0, limit) : result,
    count: result.length,
  });

  if (limit && limit > 0) {
    return result.slice(0, limit);
  }
  return result;
}

export async function findDashboardData(userId?: string): Promise<{
  widgets: (WidgetConfig & {
    hidden: boolean;
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
  })[];
}> {
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

  const widgets: (WidgetConfig & {
    hidden: boolean;
    layoutX: number;
    layoutY: number;
    layoutW: number;
    layoutH: number;
  })[] = [];

  const hasWeather = rows.some((r) => r.dataType === "weather");
  const weatherData = hasWeather ? await fetchWeather() : null;

  for (const r of rows) {
    let data = r.dataJson as WidgetConfig["data"];

    if (r.dataType === "weather" && weatherData) {
      data = weatherData;
    }

    const override = userOverrides.get(r.id);

    widgets.push({
      id: r.id,
      titleKey: r.titleKey,
      icon: r.icon,
      data,
      hidden: override?.hidden ?? r.hidden,
      layoutX: override?.x ?? r.layoutX,
      layoutY: override?.y ?? r.layoutY,
      layoutW: override?.w ?? r.layoutW,
      layoutH: override?.h ?? r.layoutH,
    });
  }

  // Emit weather widget update when weather data is included
  if (weatherData) {
    await emitWidgetUpdate("weather", "weather", {
      location: weatherData.location,
      currentTemp: weatherData.currentTemp,
      unit: weatherData.unit,
      condition: weatherData.condition,
      forecast: weatherData.forecast,
    });
  }

  return { widgets };
}
