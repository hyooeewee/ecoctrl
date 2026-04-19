import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  lastLogin: varchar("last_login", { length: 50 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
