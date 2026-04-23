import { pgTable, serial, varchar, integer, boolean } from "drizzle-orm/pg-core";

export const platformConfigs = pgTable("platform_configs", {
  id: serial("id").primaryKey(),
  platformName: varchar("platform_name", { length: 255 }).notNull(),
  refreshInterval: integer("refresh_interval").notNull(),
  realtimeAlertEnabled: boolean("realtime_alert_enabled").notNull().default(true),
  darkModeFollowSystem: boolean("dark_mode_follow_system").notNull().default(false),
  smtpHost: varchar("smtp_host", { length: 255 }).notNull().default(""),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: varchar("smtp_user", { length: 255 }).notNull().default(""),
  smtpPass: varchar("smtp_pass", { length: 255 }).notNull().default(""),
  smtpSecure: boolean("smtp_secure").notNull().default(false),
});
