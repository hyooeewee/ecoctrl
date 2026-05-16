CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"device" varchar(255) NOT NULL,
	"level" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"time" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_key" varchar(100) NOT NULL,
	"value" varchar(50) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"delta" varchar(20),
	"delta_variant" varchar(20) NOT NULL,
	"chart_type" varchar(20) NOT NULL,
	"chart_data" jsonb DEFAULT '[]' NOT NULL,
	"chart_color" varchar(100) NOT NULL,
	"footer_key" varchar(100),
	"progress_value" integer,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"value" varchar(50) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"trend" varchar(20) NOT NULL,
	"trend_type" varchar(10) NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "energy_breakdowns" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"value" integer NOT NULL,
	"color" varchar(50),
	"snapshot_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "energy_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"hour" varchar(10) NOT NULL,
	"k_wh" real NOT NULL,
	"reading_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "faults" (
	"id" uuid PRIMARY KEY NOT NULL,
	"device" varchar(255) NOT NULL,
	"level" varchar(20) NOT NULL,
	"time" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fault_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"trend" varchar(20) DEFAULT '0%' NOT NULL,
	"mttr" integer DEFAULT 0 NOT NULL,
	"avg_response_time" varchar(20) DEFAULT '0min' NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_login" varchar(50),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_reminders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task" varchar(255) NOT NULL,
	"description" text,
	"due_date" date NOT NULL,
	"priority" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"assignee" varchar(100),
	"location" varchar(255),
	"estimated_hours" integer DEFAULT 0,
	"last_completed" date
);
--> statement-breakpoint
CREATE TABLE "report_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"receiver" varchar(255) NOT NULL,
	"frequency" varchar(100) NOT NULL,
	"status" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL
);
