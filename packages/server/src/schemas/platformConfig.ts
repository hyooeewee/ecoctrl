import { pgTable, serial, varchar, integer, boolean } from "drizzle-orm/pg-core";

export const platformConfigs = pgTable("platform_configs", {
  id: serial("id").primaryKey(),
  platformName: varchar("platform_name", { length: 255 }).notNull(),
  refreshInterval: integer("refresh_interval").notNull(),
  realtimeAlertEnabled: boolean("realtime_alert_enabled").notNull().default(true),
  timezone: varchar("timezone", { length: 100 }).notNull().default("Asia/Shanghai"),
  autoBackup: boolean("auto_backup").notNull().default(true),
  backupRetentionDays: integer("backup_retention_days").notNull().default(30),
  sessionTimeout: integer("session_timeout").notNull().default(30),
  smtpHost: varchar("smtp_host", { length: 255 }).notNull().default(""),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: varchar("smtp_user", { length: 255 }).notNull().default(""),
  smtpPass: varchar("smtp_pass", { length: 255 }).notNull().default(""),
  smtpSecure: boolean("smtp_secure").notNull().default(false),
  allowRegistration: boolean("allow_registration").notNull().default(true),
  allowPasswordReset: boolean("allow_password_reset").notNull().default(true),
});
