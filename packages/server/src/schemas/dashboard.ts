import { pgTable, serial, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const dashboardStats = pgTable("dashboard_stats", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 50 }).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  trend: varchar("trend", { length: 20 }).notNull(),
  trendType: varchar("trend_type", { length: 10 }).notNull(),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),
});

export const dashboardCards = pgTable("dashboard_cards", {
  id: serial("id").primaryKey(),
  titleKey: varchar("title_key", { length: 100 }).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  delta: varchar("delta", { length: 20 }),
  deltaVariant: varchar("delta_variant", { length: 20 }).notNull(),
  chartType: varchar("chart_type", { length: 20 }).notNull(),
  chartData: jsonb("chart_data").notNull().default("[]"),
  chartColor: varchar("chart_color", { length: 100 }).notNull(),
  footerKey: varchar("footer_key", { length: 100 }),
  progressValue: integer("progress_value"),
  sortOrder: integer("sort_order").notNull().default(0),
});
