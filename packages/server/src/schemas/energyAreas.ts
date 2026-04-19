import { pgTable, serial, varchar, integer, real } from "drizzle-orm/pg-core";

export const energyAreas = pgTable("energy_areas", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  current: integer("current").notNull(),
  target: integer("target").notNull(),
  color: varchar("color", { length: 100 }).notNull(),
  powerFactor: real("power_factor").notNull(),
  loadRate: varchar("load_rate", { length: 20 }).notNull(),
});
