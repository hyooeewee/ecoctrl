import { pgTable, serial, varchar, timestamp, real } from "drizzle-orm/pg-core";

export const energyReadings = pgTable("energy_readings", {
  id: serial("id").primaryKey(),
  hour: varchar("hour", { length: 10 }).notNull(),
  kWh: real("k_wh").notNull(),
  readingAt: timestamp("reading_at", { withTimezone: true }).defaultNow(),
});
