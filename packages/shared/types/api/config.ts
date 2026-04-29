import { z } from "zod";

export const ThreeDConfigSchema = z.object({
  cameraPreset: z.string(),
  ambientLightIntensity: z.number(),
  hotspots: z.array(z.unknown()),
  labels: z.array(z.unknown()),
});
export type ThreeDConfig = z.infer<typeof ThreeDConfigSchema>;

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
