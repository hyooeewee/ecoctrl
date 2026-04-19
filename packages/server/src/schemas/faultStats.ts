import { pgTable, serial, integer, varchar, timestamp, real } from "drizzle-orm/pg-core";

export const faultStats = pgTable("fault_stats", {
  id: serial("id").primaryKey(),
  totalCount: integer("total_count").notNull().default(0),
  trend: varchar("trend", { length: 20 }).notNull().default("0%"),
  mttr: real("mttr").notNull().default(0),
  avgResponseTime: varchar("avg_response_time", { length: 20 }).notNull().default("0min"),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),
});
