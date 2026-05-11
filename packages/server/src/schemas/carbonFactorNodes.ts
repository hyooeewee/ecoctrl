import { pgTable, serial, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const carbonFactorNodes = pgTable("carbon_factor_nodes", {
  id: serial("id").primaryKey(),
  pkid: varchar("pkid", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 500 }),
  nameEn: varchar("name_en", { length: 500 }),
  parentPkid: varchar("parent_pkid", { length: 50 }),
  isLeaf: boolean("is_leaf").default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
