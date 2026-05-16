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
CREATE TABLE "objects" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"model_id" varchar(255) NOT NULL,
	"model_name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'offline' NOT NULL,
	"points" jsonb DEFAULT '[]'::jsonb
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
	"version" integer DEFAULT 1 NOT NULL,
	"is_latest" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "dashboard_stats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "three_d_configs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "dashboard_stats" CASCADE;--> statement-breakpoint
DROP TABLE "three_d_configs" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE "models" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "models" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "device_type" varchar(1) NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "file_url" varchar(500);--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "points" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "timezone" varchar(100) DEFAULT 'Asia/Shanghai' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "auto_backup" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "backup_retention_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "session_timeout" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "smtp_host" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "smtp_port" integer DEFAULT 587 NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "smtp_user" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "smtp_pass" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "smtp_secure" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "allow_registration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "allow_password_reset" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_configs" ADD COLUMN "allow_oauth_login" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "platform_configs" DROP COLUMN "dark_mode_follow_system";