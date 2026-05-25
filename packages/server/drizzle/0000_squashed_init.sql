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
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"device" varchar(255) NOT NULL,
	"level" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"time" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"next_backup" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carbon_factor_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pkid" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"full_name" varchar(500),
	"name_en" varchar(500),
	"parent_pkid" varchar(50),
	"is_leaf" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "carbon_factor_nodes_pkid_unique" UNIQUE("pkid")
);
--> statement-breakpoint
CREATE TABLE "carbon_factors" (
	"id" serial PRIMARY KEY NOT NULL,
	"pkid" varchar(50),
	"name" varchar(255) NOT NULL,
	"unit_group" varchar(100),
	"category" varchar(255),
	"value" real,
	"unit" varchar(50),
	"location" varchar(100),
	"source" varchar(255),
	"raw_data" jsonb DEFAULT '{}',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_file_url" varchar(512),
	"camera_preset" varchar(100) NOT NULL,
	"ambient_light_intensity" real NOT NULL,
	"hotspots" jsonb DEFAULT '[]' NOT NULL,
	"labels" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_key" varchar(100) NOT NULL,
	"icon" varchar(50) NOT NULL,
	"layout_x" integer NOT NULL,
	"layout_y" integer NOT NULL,
	"layout_w" integer NOT NULL,
	"layout_h" integer NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"data_type" varchar(20) NOT NULL,
	"metric_key" varchar(50),
	"data_json" jsonb DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "energy_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"hour" varchar(10) NOT NULL,
	"k_wh" real NOT NULL,
	"reading_at" timestamp with time zone DEFAULT now()
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
	"mttr" real DEFAULT 0 NOT NULL,
	"avg_response_time" varchar(20) DEFAULT '0min' NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(100),
	"size" integer DEFAULT 0 NOT NULL,
	"file_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(255) DEFAULT '' NOT NULL,
	"password" varchar(255),
	"email" varchar(255) NOT NULL,
	"role" varchar(100) DEFAULT 'viewer' NOT NULL,
	"status" varchar(20) DEFAULT 'offline' NOT NULL,
	"last_login" varchar(50),
	"avatar_url" varchar(500),
	"preferences" jsonb DEFAULT '{}' NOT NULL,
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
	"name" varchar(255) NOT NULL,
	"count" varchar(100) NOT NULL,
	"icon" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iot_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(255),
	"description" varchar(500),
	"version" varchar(50),
	"format" varchar(20),
	"size" varchar(50),
	"file_url" varchar(500),
	"thumbnail_url" varchar(500),
	"doc_url" varchar(500),
	CONSTRAINT "models_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(255),
	"name" varchar(255),
	"description" varchar(500),
	"model_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'offline'
);
--> statement-breakpoint
CREATE TABLE "platform_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform_name" varchar(255) NOT NULL,
	"refresh_interval" integer NOT NULL,
	"realtime_alert_enabled" boolean DEFAULT true NOT NULL,
	"timezone" varchar(100) DEFAULT 'Asia/Shanghai' NOT NULL,
	"auto_backup" boolean DEFAULT true NOT NULL,
	"backup_retention_days" integer DEFAULT 30 NOT NULL,
	"session_timeout" integer DEFAULT 30 NOT NULL,
	"smtp_host" varchar(255) DEFAULT '' NOT NULL,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"smtp_user" varchar(255) DEFAULT '' NOT NULL,
	"smtp_pass" varchar(255) DEFAULT '' NOT NULL,
	"smtp_secure" boolean DEFAULT false NOT NULL,
	"allow_registration" boolean DEFAULT false NOT NULL,
	"allow_password_reset" boolean DEFAULT false NOT NULL,
	"allow_oauth_login" boolean DEFAULT false NOT NULL,
	"system_prompt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
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
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"access_token" varchar(1000),
	"refresh_token" varchar(1000),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"type" varchar(10) NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(255),
	"description" varchar(500),
	"props" jsonb DEFAULT '[]'::jsonb,
	"values" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"trigger_data" jsonb,
	"result" jsonb,
	"error_message" text,
	"node_logs" jsonb DEFAULT '[]'::jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"dsl" jsonb NOT NULL,
	"published_dsl" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"is_latest" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "objects" ADD CONSTRAINT "objects_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "object_model_code_idx" ON "objects" USING btree ("model_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "point_object_type_code_idx" ON "points" USING btree ("object_id","type","code");