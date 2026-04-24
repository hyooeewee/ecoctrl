import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const oauthAccounts = pgTable("oauth_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
  providerEmail: varchar("provider_email", { length: 255 }),
  accessToken: varchar("access_token", { length: 1000 }),
  refreshToken: varchar("refresh_token", { length: 1000 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
