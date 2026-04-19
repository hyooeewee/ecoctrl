import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const faults = pgTable("faults", {
  id: uuid("id").primaryKey(),
  device: varchar("device", { length: 255 }).notNull(),
  level: varchar("level", { length: 20 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
