import { db } from "@/config/database";
import { dashboardStats, dashboardCards } from "@/schemas/dashboard";
import { energyReadings, energyBreakdowns } from "@/schemas/energy";
import { alerts } from "@/schemas/alerts";
import type { DashboardStats, EnergyChartItem, Alert, DashboardCard, DashboardData, TrendPoint, BreakdownItem, DeviceStatusItem, AiSuggestionItem } from "@/types/index";

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
  const [stats, cardsRows, trendRows, breakdownRows] = await Promise.all([
    getDashboardStats(),
    db.select().from(dashboardCards).orderBy(dashboardCards.sortOrder),
    db.select().from(energyReadings),
    db.select().from(energyBreakdowns),
  ]);

  const cards: DashboardCard[] = cardsRows.map((r) => ({
    titleKey: r.titleKey,
    value: r.value,
    unit: r.unit,
    delta: r.delta ?? undefined,
    deltaVariant: r.deltaVariant as DashboardCard["deltaVariant"],
    chartType: r.chartType as DashboardCard["chartType"],
    chartData: (r.chartData as { v: number }[]) ?? [],
    chartColor: r.chartColor,
    footerKey: r.footerKey ?? undefined,
    progressValue: r.progressValue ?? undefined,
  }));

  const trend: TrendPoint[] = trendRows.map((r) => ({ h: r.hour, kWh: r.kWh }));
  const breakdown: BreakdownItem[] = breakdownRows.map((r) => ({
    name: r.category,
    value: r.value,
    color: r.color ?? "",
  }));

  const devices: DeviceStatusItem[] = [
    { category: "hvac", count: 6, status: "critical" },
    { category: "lighting", count: 30, status: "warn" },
    { category: "elevator", count: 10, status: "ok" },
    { category: "server", count: 24, status: "ok" },
  ];

  const aiSuggestions: AiSuggestionItem[] = [
    { category: "hvac", text: "优化暖通夜间计划——降低夜间温控设定值至 18°C", saving: "预计节能 12%" },
    { category: "lighting", text: "根据占用传感器调整照明——B2–B4 区域", saving: "预计节能 8%" },
    { category: "server", text: "将非关键服务器任务迁移至低峰期 (02:00–06:00)", saving: "预计节省 5% 费用" },
  ];

  return { cards, trend, breakdown, devices, aiSuggestions };
}
