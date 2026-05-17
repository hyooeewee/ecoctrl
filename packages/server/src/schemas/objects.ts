import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { models } from "./models";

export const objects = pgTable("objects", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  id: varchar("id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  modelId: uuid("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  modelName: varchar("model_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("offline"),
});
