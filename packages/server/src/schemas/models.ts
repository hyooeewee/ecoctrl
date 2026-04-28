import { pgTable, uuid, varchar, jsonb } from "drizzle-orm/pg-core";

export interface PointItem {
  id: string;
  name: string;
  props: { key: string; name: string; unit?: string }[];
}

export const models = pgTable("models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  format: varchar("format", { length: 20 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  docUrl: varchar("doc_url", { length: 500 }),
  points: jsonb("points").$type<PointItem[]>().default([]),
});
