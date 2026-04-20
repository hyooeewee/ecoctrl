import { pgTable, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  settings: jsonb("settings").notNull().default("{}"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
