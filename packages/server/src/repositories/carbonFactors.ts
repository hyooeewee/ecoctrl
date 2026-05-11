import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { carbonFactors } from "@/schemas/carbonFactors";
import type { CarbonFactor } from "@ecoctrl/shared";

export async function findManyCarbonFactors(): Promise<CarbonFactor[]> {
  const rows = await db.select().from(carbonFactors).orderBy(carbonFactors.id);
  return rows.map((r) => ({
    id: r.id,
    pkid: r.pkid ?? undefined,
    name: r.name,
    unitGroup: r.unitGroup ?? undefined,
    category: r.category ?? undefined,
    value: r.value ?? undefined,
    unit: r.unit ?? undefined,
    location: r.location ?? undefined,
    source: r.source ?? undefined,
    rawData: r.rawData ?? undefined,
    updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
  }));
}

export async function replaceCarbonFactorsForPkid(
  pkid: string,
  data: {
    name: string;
    category: string;
    value?: number;
    unit?: string;
    rawData?: unknown;
    source: string;
  }[],
): Promise<void> {
  await db.delete(carbonFactors).where(eq(carbonFactors.pkid, pkid));
  if (data.length) {
    const now = new Date();
    await db.insert(carbonFactors).values(
      data.map((d) => ({
        pkid,
        name: d.name,
        category: d.category,
        value: d.value ?? null,
        unit: d.unit ?? null,
        source: d.source,
        rawData: d.rawData ?? null,
        updatedAt: now,
      })),
    );
  }
}
