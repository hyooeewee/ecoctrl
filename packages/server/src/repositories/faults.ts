import { db } from "@/config/database";
import { faults } from "@/schemas/faults";
import { faultStats } from "@/schemas/faultStats";
import type { Fault, FaultStats } from "@/types/index";

export async function getFaults(): Promise<Fault[]> {
  const rows = await db.select().from(faults);
  return rows.map((r) => ({
    id: r.id,
    device: r.device,
    level: r.level as "严重" | "一般" | "提示",
    time: r.time,
    status: r.status as "待处理" | "维保中" | "已修复",
  }));
}

export async function getFaultStats(): Promise<FaultStats> {
  const rows = await db.select().from(faultStats);
  if (rows.length === 0) {
    return { totalCount: 0, trend: "0%", mttr: 0, avgResponseTime: "0min" };
  }
  const s = rows[0];
  return {
    totalCount: s.totalCount,
    trend: s.trend,
    mttr: s.mttr,
    avgResponseTime: s.avgResponseTime,
  };
}
