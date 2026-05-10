import { pgTable, serial, varchar, real, jsonb } from "drizzle-orm/pg-core";

export const dashboardModels = pgTable("dashboard_models", {
  id: serial("id").primaryKey(),
  modelFileUrl: varchar("model_file_url", { length: 512 }),
  cameraPreset: varchar("camera_preset", { length: 100 }).notNull(),
  ambientLightIntensity: real("ambient_light_intensity").notNull(),
  hotspots: jsonb("hotspots").default("[]").notNull(),
  labels: jsonb("labels").default("[]").notNull(),
});
