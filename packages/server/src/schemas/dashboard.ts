import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const dashboardStats = pgTable("dashboard_stats", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  trend: varchar("trend", { length: 20 }).notNull(),
  trendType: varchar("trend_type", { length: 10 }).notNull(),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),
});
