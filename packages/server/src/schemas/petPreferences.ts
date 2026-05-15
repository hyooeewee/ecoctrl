import { pgTable, integer, text, boolean, real, timestamp } from "drizzle-orm/pg-core";

export const petPreferences = pgTable("user_pet_preferences", {
  userId: integer("user_id").primaryKey(),
  theme: text("theme").notNull().default("tech-robot"),
  voiceEnabled: boolean("voice_enabled").notNull().default(true),
  voiceSpeed: real("voice_speed").notNull().default(1.0),
  petPositionX: real("pet_position_x"),
  petPositionY: real("pet_position_y"),
  wakeWordEnabled: boolean("wake_word_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
