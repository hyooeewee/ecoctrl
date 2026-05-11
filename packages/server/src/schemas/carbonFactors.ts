import { pgTable, serial, varchar, real, timestamp, jsonb } from "drizzle-orm/pg-core";

export const carbonFactors = pgTable("carbon_factors", {
  id: serial("id").primaryKey(),
  pkid: varchar("pkid", { length: 50 }),
  name: varchar("name", { length: 255 }).notNull(),
  unitGroup: varchar("unit_group", { length: 100 }),
  category: varchar("category", { length: 255 }),
  value: real("value"),
  unit: varchar("unit", { length: 50 }),
  location: varchar("location", { length: 100 }),
  source: varchar("source", { length: 255 }),
  rawData: jsonb("raw_data").default("{}"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
