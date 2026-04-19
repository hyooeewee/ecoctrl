import { pgTable, serial, varchar, integer, timestamp, real } from "drizzle-orm/pg-core";

export const energyReadings = pgTable("energy_readings", {
  id: serial("id").primaryKey(),
  hour: varchar("hour", { length: 10 }).notNull(),
  kWh: real("k_wh").notNull(),
  readingAt: timestamp("reading_at", { withTimezone: true }).defaultNow(),
});

export const energyBreakdowns = pgTable("energy_breakdowns", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  value: integer("value").notNull(),
  color: varchar("color", { length: 50 }),
  snapshotAt: timestamp("snapshot_at", { withTimezone: true }).defaultNow(),
});
