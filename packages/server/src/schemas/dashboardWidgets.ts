import { pgTable, uuid, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  titleKey: varchar("title_key", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  layoutX: integer("layout_x").notNull(),
  layoutY: integer("layout_y").notNull(),
  layoutW: integer("layout_w").notNull(),
  layoutH: integer("layout_h").notNull(),
  hidden: boolean("hidden").notNull().default(false),
  dataType: varchar("data_type", { length: 20 }).notNull(),
  dataJson: jsonb("data_json").notNull().default("{}"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
