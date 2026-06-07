import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { dashboardModels } from "@/schemas/dashboardModel";
import type { DashboardModelLabel, ModelFileEntry } from "@ecoctrl/shared";

export interface DashboardModelConfig {
  modelFileUrl: string | null;
  modelFiles: ModelFileEntry[];
  cameraPreset: string;
  ambientLightIntensity: number;
  hotspots: unknown[];
  labels: DashboardModelLabel[];
}

export async function findDashboardModel(): Promise<DashboardModelConfig | null> {
  const rows = await db.select().from(dashboardModels).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    modelFileUrl: r.modelFileUrl,
    modelFiles: (r.modelFiles as ModelFileEntry[]) ?? [],
    cameraPreset: r.cameraPreset,
    ambientLightIntensity: r.ambientLightIntensity,
    hotspots: r.hotspots as unknown[],
    labels: r.labels as DashboardModelLabel[],
  };
}

export async function updateDashboardModel(
  config: DashboardModelConfig,
): Promise<DashboardModelConfig> {
  const rows = await db.select().from(dashboardModels).limit(1);
  if (rows.length === 0) {
    const result = await db
      .insert(dashboardModels)
      .values({
        modelFileUrl: config.modelFileUrl,
        modelFiles: config.modelFiles,
        cameraPreset: config.cameraPreset,
        ambientLightIntensity: config.ambientLightIntensity,
        hotspots: config.hotspots,
        labels: config.labels,
      })
      .returning();
    const r = result[0];
    return {
      modelFileUrl: r.modelFileUrl,
      modelFiles: (r.modelFiles as ModelFileEntry[]) ?? [],
      cameraPreset: r.cameraPreset,
      ambientLightIntensity: r.ambientLightIntensity,
      hotspots: r.hotspots as unknown[],
      labels: r.labels as DashboardModelLabel[],
    };
  } else {
    const result = await db
      .update(dashboardModels)
      .set({
        modelFileUrl: config.modelFileUrl,
        modelFiles: config.modelFiles,
        cameraPreset: config.cameraPreset,
        ambientLightIntensity: config.ambientLightIntensity,
        hotspots: config.hotspots,
        labels: config.labels,
      })
      .where(eq(dashboardModels.id, rows[0].id))
      .returning();
    const r = result[0];
    return {
      modelFileUrl: r.modelFileUrl,
      modelFiles: (r.modelFiles as ModelFileEntry[]) ?? [],
      cameraPreset: r.cameraPreset,
      ambientLightIntensity: r.ambientLightIntensity,
      hotspots: r.hotspots as unknown[],
      labels: r.labels as DashboardModelLabel[],
    };
  }
}
