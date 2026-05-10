import { z } from "zod";

export const DashboardModelLabelSchema = z.object({
  key: z.string(),
  fallbackPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  meshKeywords: z.array(z.string()),
  focusAlpha: z.number(),
  focusBeta: z.number(),
  focusRadius: z.number(),
});
export type DashboardModelLabel = z.infer<typeof DashboardModelLabelSchema>;

export const DashboardModelConfigSchema = z.object({
  modelFileUrl: z.string().nullable().optional(),
  cameraPreset: z.string(),
  ambientLightIntensity: z.number(),
  hotspots: z.array(z.unknown()),
  labels: z.array(z.unknown()),
});
export type DashboardModelConfig = z.infer<typeof DashboardModelConfigSchema>;

export const SystemConfigSchema = z.object({
  platformName: z.string(),
  refreshInterval: z.number(),
  realtimeAlertEnabled: z.boolean(),
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string(),
  alertSound: z.boolean(),
  smtpHost: z.string(),
  smtpPort: z.number(),
  smtpUser: z.string(),
  smtpPass: z.string(),
  smtpSecure: z.boolean(),
  autoBackup: z.boolean(),
  backupRetentionDays: z.number(),
  sessionTimeout: z.number(),
  allowRegistration: z.boolean(),
  allowPasswordReset: z.boolean(),
  allowOAuthLogin: z.boolean(),
});
export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export const PublicSystemConfigSchema = z.object({
  platformName: z.string(),
  allowRegistration: z.boolean(),
  allowPasswordReset: z.boolean(),
  allowOAuthLogin: z.boolean(),
});
export type PublicSystemConfig = z.infer<typeof PublicSystemConfigSchema>;

export const BackupScheduleSchema = z.object({
  nextBackup: z.string(),
});
export type BackupSchedule = z.infer<typeof BackupScheduleSchema>;
