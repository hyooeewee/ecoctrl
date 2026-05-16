CREATE TABLE "backup_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"next_backup" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"current" integer NOT NULL,
	"target" integer NOT NULL,
	"color" varchar(100) NOT NULL,
	"power_factor" real NOT NULL,
	"load_rate" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(50) NOT NULL,
	"format" varchar(20) NOT NULL,
	"size" varchar(50) NOT NULL,
	"thumbnail_url" varchar(500),
	"doc_url" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "three_d_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"camera_preset" varchar(100) NOT NULL,
	"ambient_light_intensity" real NOT NULL,
	"hotspots" jsonb DEFAULT '[]' NOT NULL,
	"labels" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_name" varchar(255) NOT NULL,
	"refresh_interval" integer NOT NULL,
	"realtime_alert_enabled" boolean DEFAULT true NOT NULL,
	"dark_mode_follow_system" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(500);--> statement-breakpoint
ALTER TABLE "report_templates" ADD COLUMN "count" varchar(100) NOT NULL DEFAULT '0 份';--> statement-breakpoint
ALTER TABLE "report_templates" ADD COLUMN "icon" varchar(50) NOT NULL DEFAULT '📄';