import { pgTable, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { models } from "./models";

export const objects = pgTable(
  "objects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 255 }),
    name: varchar("name", { length: 255 }),
    description: varchar("description", { length: 500 }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("offline"),
  },
  (table) => [uniqueIndex("object_model_code_idx").on(table.modelId, table.code)],
);
