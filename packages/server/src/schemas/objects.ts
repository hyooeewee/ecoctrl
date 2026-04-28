import { pgTable, uuid, varchar, jsonb } from "drizzle-orm/pg-core";

export interface ObjectPoint {
  pointId: string;
  pointName: string;
  values: Record<string, string>;
}

export const objects = pgTable("objects", {
  uuid: uuid("uuid").primaryKey().defaultRandom(),
  id: varchar("id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  modelId: varchar("model_id", { length: 255 }).notNull(),
  modelName: varchar("model_name", { length: 255 }).notNull(),
  points: jsonb("points").$type<ObjectPoint[]>().default([]),
});
