import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { platformConfigs } from "@/schemas/platformConfig";

export interface PlatformConfig {
  platformName: string;
  refreshInterval: number;
  realtimeAlertEnabled: boolean;
  darkModeFollowSystem: boolean;
}

export async function getPlatformConfig(): Promise<PlatformConfig | null> {
  const rows = await db.select().from(platformConfigs).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    platformName: r.platformName,
    refreshInterval: r.refreshInterval,
    realtimeAlertEnabled: r.realtimeAlertEnabled,
    darkModeFollowSystem: r.darkModeFollowSystem,
  };
}

export async function setPlatformConfig(config: PlatformConfig): Promise<void> {
  const rows = await db.select().from(platformConfigs).limit(1);
  if (rows.length === 0) {
    await db.insert(platformConfigs).values(config);
  } else {
    await db.update(platformConfigs).set(config).where(eq(platformConfigs.id, rows[0].id));
  }
}
