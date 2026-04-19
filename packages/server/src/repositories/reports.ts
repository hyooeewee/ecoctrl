import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { reportPlans, reportTemplates } from "@/schemas/reports";
import type { ReportPlan } from "@/types/index";

export async function getReportPlans(): Promise<ReportPlan[]> {
  return db.select().from(reportPlans);
}

export async function addReportPlan(plan: ReportPlan): Promise<void> {
  await db.insert(reportPlans).values(plan);
}

export async function updateReportPlan(id: string, patch: Partial<ReportPlan>): Promise<ReportPlan | null> {
  const result = await db
    .update(reportPlans)
    .set(patch)
    .where(eq(reportPlans.id, id))
    .returning();
  if (result.length === 0) return null;
  return result[0] as ReportPlan;
}

export async function getReportTemplates(): Promise<string[]> {
  const rows = await db.select().from(reportTemplates);
  return rows.map((r) => r.name);
}
