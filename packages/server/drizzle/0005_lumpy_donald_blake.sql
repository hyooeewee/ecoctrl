CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"session_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_pet_preferences" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'tech-robot' NOT NULL,
	"voice_enabled" boolean DEFAULT true NOT NULL,
	"voice_speed" real DEFAULT 1 NOT NULL,
	"pet_position_x" real,
	"pet_position_y" real,
	"wake_word_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
