import { pgTable, uuid, varchar, boolean, serial } from "drizzle-orm/pg-core";

export const reportPlans = pgTable("report_plans", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  receiver: varchar("receiver", { length: 255 }).notNull(),
  frequency: varchar("frequency", { length: 100 }).notNull(),
  status: boolean("status").notNull().default(true),
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  count: varchar("count", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
});
