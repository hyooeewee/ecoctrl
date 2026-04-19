import { pgTable, serial, text, bigint } from "drizzle-orm/pg-core";

export const iotTokens = pgTable("iot_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
});
