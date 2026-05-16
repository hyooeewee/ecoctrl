import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { platformConfigs } from "@/schemas/platformConfig";
import { getLogger } from "@/lib/logger";
import { env } from "@/lib/env";

const logger = getLogger("platformConfig");

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
  allowRegistration: boolean;
  allowPasswordReset: boolean;
  allowOAuthLogin: boolean;
  systemPrompt: string;
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
  allowRegistration: false,
  allowPasswordReset: false,
  allowOAuthLogin: false,
  systemPrompt:
    "你是蓝宝，EcoCtrl 能源管理平台的智能助手。\n\n平台能力：\n\n- 三维建筑能耗可视化（BabylonJS）\n- 实时监控暖通空调、照明、电梯、服务器等设备状态\n- 能耗数据分析与 AI 优化建议\n- 实时告警管理\n\n回复风格：\n\n- 使用中文回复\n- 简洁、专业、友好\n- 需要调用工具时直接调用，不要告知用户你在调用工具\n- 对于不确定的问题，坦诚说明不要编造",
};

export async function findPlatformConfig(): Promise<PlatformConfig> {
  const rows = await db.select().from(platformConfigs).limit(1);
  const r = rows[0] ?? DEFAULT_CONFIG;
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
    allowRegistration: r.allowRegistration,
    allowPasswordReset: r.allowPasswordReset,
    allowOAuthLogin: r.allowOAuthLogin,
    systemPrompt: r.systemPrompt,
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
      allowRegistration: r.allowRegistration,
      allowPasswordReset: r.allowPasswordReset,
      allowOAuthLogin: r.allowOAuthLogin,
      systemPrompt: r.systemPrompt,
    };
  } else {
    const result = await db
      .update(platformConfigs)
      .set(config)
      .where(eq(platformConfigs.id, rows[0].id))
      .returning();
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
      allowRegistration: r.allowRegistration,
      allowPasswordReset: r.allowPasswordReset,
      allowOAuthLogin: r.allowOAuthLogin,
      systemPrompt: r.systemPrompt,
    };
  }
}

export async function syncSmtpFromEnv(): Promise<void> {
  const envHost = env.SMTP_HOST?.trim() || "";
  const envUser = env.SMTP_USER?.trim() || "";
  const envPass = env.SMTP_PASS?.trim() || "";

  if (!envHost || !envUser || !envPass) return;

  const existing = await findPlatformConfig();
  if (!existing) return;

  // Only overwrite if DB SMTP fields are empty (protect user-managed DB values)
  if (!existing.smtpHost && !existing.smtpUser && !existing.smtpPass) {
    await updatePlatformConfig({
      ...existing,
      smtpHost: envHost,
      smtpPort: Number(env.SMTP_PORT) || 587,
      smtpUser: envUser,
      smtpPass: envPass,
      smtpSecure: env.SMTP_SECURE,
    });
    logger.info("[SMTP] Synced SMTP config from env to database (empty fields filled)");
  }
}
