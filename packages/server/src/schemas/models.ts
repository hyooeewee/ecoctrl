import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const models = pgTable("models", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  description: varchar("description", { length: 500 }),
  version: varchar("version", { length: 50 }),
  format: varchar("format", { length: 20 }),
  size: varchar("size", { length: 50 }),
  fileUrl: varchar("file_url", { length: 500 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  docUrl: varchar("doc_url", { length: 500 }),
});
