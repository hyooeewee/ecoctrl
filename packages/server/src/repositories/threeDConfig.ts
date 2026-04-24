import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { threeDConfigs } from "@/schemas/threeDConfig";

export interface ThreeDConfig {
  cameraPreset: string;
  ambientLightIntensity: number;
  hotspots: unknown[];
  labels: unknown[];
}

export async function findThreeDConfig(): Promise<ThreeDConfig | null> {
  const rows = await db.select().from(threeDConfigs).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    cameraPreset: r.cameraPreset,
    ambientLightIntensity: r.ambientLightIntensity,
    hotspots: r.hotspots as unknown[],
    labels: r.labels as unknown[],
  };
}

export async function updateThreeDConfig(config: ThreeDConfig): Promise<ThreeDConfig> {
  const rows = await db.select().from(threeDConfigs).limit(1);
  if (rows.length === 0) {
    const result = await db.insert(threeDConfigs).values({
      cameraPreset: config.cameraPreset,
      ambientLightIntensity: config.ambientLightIntensity,
      hotspots: config.hotspots,
      labels: config.labels,
    }).returning();
    const r = result[0];
    return {
      cameraPreset: r.cameraPreset,
      ambientLightIntensity: r.ambientLightIntensity,
      hotspots: r.hotspots as unknown[],
      labels: r.labels as unknown[],
    };
  } else {
    const result = await db
      .update(threeDConfigs)
      .set({
        cameraPreset: config.cameraPreset,
        ambientLightIntensity: config.ambientLightIntensity,
        hotspots: config.hotspots,
        labels: config.labels,
      })
      .where(eq(threeDConfigs.id, rows[0].id))
      .returning();
    const r = result[0];
    return {
      cameraPreset: r.cameraPreset,
      ambientLightIntensity: r.ambientLightIntensity,
      hotspots: r.hotspots as unknown[],
      labels: r.labels as unknown[],
    };
  }
}
