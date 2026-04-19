import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey(),
  device: varchar("device", { length: 255 }).notNull(),
  level: varchar("level", { length: 20 }).notNull(),
  message: text("message").notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});
