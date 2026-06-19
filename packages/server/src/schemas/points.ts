import { pgTable, uuid, varchar, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { models } from "./models";
import { objects } from "./objects";

export interface PointProp {
  key: string;
  name: string;
  unit?: string;
}

export const points = pgTable(
  "points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectId: uuid("object_id")
      .notNull()
      .references(() => objects.id, { onDelete: "cascade" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 10 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    name: varchar("name", { length: 255 }),
    description: varchar("description", { length: 500 }),
    region: varchar("region", { length: 100 }),
    system: varchar("system", { length: 100 }),
    props: jsonb("props").$type<PointProp[]>().default([]),
    values: jsonb("values").$type<Record<string, string>>().default({}),
  },
  (table) => [uniqueIndex("point_object_type_code_idx").on(table.objectId, table.type, table.code)],
);
