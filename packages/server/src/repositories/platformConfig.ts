import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { platformConfigs } from "@/schemas/platformConfig";

export interface PlatformConfig {
  platformName: string;
  refreshInterval: number;
  realtimeAlertEnabled: boolean;
  darkModeFollowSystem: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
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
    smtpHost: r.smtpHost,
    smtpPort: r.smtpPort,
    smtpUser: r.smtpUser,
    smtpPass: r.smtpPass,
    smtpSecure: r.smtpSecure,
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

export async function syncSmtpFromEnv(): Promise<void> {
  const envHost = process.env.SMTP_HOST?.trim() || "";
  const envUser = process.env.SMTP_USER?.trim() || "";
  const envPass = process.env.SMTP_PASS?.trim() || "";

  if (!envHost || !envUser || !envPass) return;

  const existing = await getPlatformConfig();

  if (!existing) {
    // No config row yet — create one with defaults + SMTP from env
    await setPlatformConfig({
      platformName: "EcoCtrl 能管平台",
      refreshInterval: 30,
      realtimeAlertEnabled: true,
      darkModeFollowSystem: false,
      smtpHost: envHost,
      smtpPort: Number(process.env.SMTP_PORT) || 587,
      smtpUser: envUser,
      smtpPass: envPass,
      smtpSecure: process.env.SMTP_SECURE === "true",
    });
    console.log("[SMTP] Synced SMTP config from env to database (new row)");
    return;
  }

  // Only overwrite if DB SMTP fields are empty (protect user-managed DB values)
  if (!existing.smtpHost && !existing.smtpUser && !existing.smtpPass) {
    await setPlatformConfig({
      ...existing,
      smtpHost: envHost,
      smtpPort: Number(process.env.SMTP_PORT) || 587,
      smtpUser: envUser,
      smtpPass: envPass,
      smtpSecure: process.env.SMTP_SECURE === "true",
    });
    console.log("[SMTP] Synced SMTP config from env to database (empty fields filled)");
  }
}
