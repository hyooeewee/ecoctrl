import { pgTable, uuid, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { USER_ROLE_LIST } from "@ecoctrl/shared";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).notNull().default(""),
  password: varchar("password", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 })
    .notNull()
    .default(USER_ROLE_LIST[USER_ROLE_LIST.length - 1]),
  status: varchar("status", { length: 20 }).notNull().default("offline"),
  lastLogin: varchar("last_login", { length: 50 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  preferences: jsonb("preferences").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
