import { pgTable, varchar } from "drizzle-orm/pg-core";

export const models = pgTable("models", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  format: varchar("format", { length: 20 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  docUrl: varchar("doc_url", { length: 500 }),
});
