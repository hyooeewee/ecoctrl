import { pgTable, varchar, jsonb } from "drizzle-orm/pg-core";

export interface ObjectPoint {
  id: string;
  pointId: string;
  pointName: string;
  values: Record<string, string>;
}

export const objects = pgTable("objects", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  modelId: varchar("model_id", { length: 255 }).notNull(),
  modelName: varchar("model_name", { length: 255 }).notNull(),
  points: jsonb("points").$type<ObjectPoint[]>().default([]),
});
