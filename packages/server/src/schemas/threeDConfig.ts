import { pgTable, serial, varchar, real, jsonb } from "drizzle-orm/pg-core";

export const threeDConfigs = pgTable("three_d_configs", {
  id: serial("id").primaryKey(),
  cameraPreset: varchar("camera_preset", { length: 100 }).notNull(),
  ambientLightIntensity: real("ambient_light_intensity").notNull(),
  hotspots: jsonb("hotspots").default("[]").notNull(),
  labels: jsonb("labels").default("[]").notNull(),
});
