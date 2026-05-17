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
      .references(() => objects.uuid, { onDelete: "cascade" }),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    pointType: varchar("point_type", { length: 10 }).notNull(),
    pointNo: varchar("point_no", { length: 10 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    props: jsonb("props").$type<PointProp[]>().default([]),
    values: jsonb("values").$type<Record<string, string>>().default({}),
  },
  (table) => [uniqueIndex("point_unique_idx").on(table.objectId, table.pointType, table.pointNo)],
);
