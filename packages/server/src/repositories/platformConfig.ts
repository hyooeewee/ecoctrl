import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { platformConfigs } from "@/schemas/platformConfig";

export interface PlatformConfig {
  platformName: string;
  refreshInterval: number;
  realtimeAlertEnabled: boolean;
  timezone: string;
  autoBackup: boolean;
  backupRetentionDays: number;
  sessionTimeout: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}

const DEFAULT_CONFIG: PlatformConfig = {
  platformName: "EcoCtrl 能管平台",
  refreshInterval: 30,
  realtimeAlertEnabled: true,
  timezone: "Asia/Shanghai",
  autoBackup: true,
  backupRetentionDays: 30,
  sessionTimeout: 30,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpSecure: false,
};

export async function findPlatformConfig(): Promise<PlatformConfig> {
  const rows = await db.select().from(platformConfigs).limit(1);
  if (rows.length === 0) {
    // Auto-insert default config on first read
    const result = await db.insert(platformConfigs).values(DEFAULT_CONFIG).returning();
    const r = result[0];
    return {
      platformName: r.platformName,
      refreshInterval: r.refreshInterval,
      realtimeAlertEnabled: r.realtimeAlertEnabled,
      timezone: r.timezone,
      autoBackup: r.autoBackup,
      backupRetentionDays: r.backupRetentionDays,
      sessionTimeout: r.sessionTimeout,
      smtpHost: r.smtpHost,
      smtpPort: r.smtpPort,
      smtpUser: r.smtpUser,
      smtpPass: r.smtpPass,
      smtpSecure: r.smtpSecure,
    };
  }
  const r = rows[0];
  return {
    platformName: r.platformName,
    refreshInterval: r.refreshInterval,
    realtimeAlertEnabled: r.realtimeAlertEnabled,
    timezone: r.timezone,
    autoBackup: r.autoBackup,
    backupRetentionDays: r.backupRetentionDays,
    sessionTimeout: r.sessionTimeout,
    smtpHost: r.smtpHost,
    smtpPort: r.smtpPort,
    smtpUser: r.smtpUser,
    smtpPass: r.smtpPass,
    smtpSecure: r.smtpSecure,
  };
}

export async function updatePlatformConfig(config: PlatformConfig): Promise<PlatformConfig> {
  const rows = await db.select().from(platformConfigs).limit(1);
  if (rows.length === 0) {
    const result = await db.insert(platformConfigs).values(config).returning();
    const r = result[0];
    return {
      platformName: r.platformName,
      refreshInterval: r.refreshInterval,
      realtimeAlertEnabled: r.realtimeAlertEnabled,
      timezone: r.timezone,
      autoBackup: r.autoBackup,
      backupRetentionDays: r.backupRetentionDays,
      sessionTimeout: r.sessionTimeout,
      smtpHost: r.smtpHost,
      smtpPort: r.smtpPort,
      smtpUser: r.smtpUser,
      smtpPass: r.smtpPass,
      smtpSecure: r.smtpSecure,
    };
  } else {
    const result = await db.update(platformConfigs).set(config).where(eq(platformConfigs.id, rows[0].id)).returning();
    const r = result[0];
    return {
      platformName: r.platformName,
      refreshInterval: r.refreshInterval,
      realtimeAlertEnabled: r.realtimeAlertEnabled,
      timezone: r.timezone,
      autoBackup: r.autoBackup,
      backupRetentionDays: r.backupRetentionDays,
      sessionTimeout: r.sessionTimeout,
      smtpHost: r.smtpHost,
      smtpPort: r.smtpPort,
      smtpUser: r.smtpUser,
      smtpPass: r.smtpPass,
      smtpSecure: r.smtpSecure,
    };
  }
}

export async function syncSmtpFromEnv(): Promise<void> {
  const envHost = process.env.SMTP_HOST?.trim() || "";
  const envUser = process.env.SMTP_USER?.trim() || "";
  const envPass = process.env.SMTP_PASS?.trim() || "";

  if (!envHost || !envUser || !envPass) return;

  const existing = await findPlatformConfig();

  // Only overwrite if DB SMTP fields are empty (protect user-managed DB values)
  if (!existing.smtpHost && !existing.smtpUser && !existing.smtpPass) {
    await updatePlatformConfig({
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
