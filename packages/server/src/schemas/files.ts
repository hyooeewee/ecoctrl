import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size").notNull().default(0),
  fileUrl: varchar("file_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
