CREATE TABLE "points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"point_type" varchar(10) NOT NULL,
	"point_no" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"props" jsonb DEFAULT '[]'::jsonb,
	"values" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "objects" ALTER COLUMN "model_id" SET DATA TYPE uuid USING model_id::uuid;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_object_id_objects_uuid_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("uuid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objects" ADD CONSTRAINT "objects_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Migrate object points from jsonb to relational table
-- Use array ordinality as fallback when pointId doesn't match expected format
INSERT INTO "points" ("object_id", "model_id", "point_type", "point_no", "name", "props", "values")
SELECT
  o.uuid AS object_id,
  o.model_id AS model_id,
  COALESCE(NULLIF(SUBSTRING(p->>'pointId' FROM '^[A-Z]_[0-9]{4}_([A-Z]+)_[0-9]+$'), ''), 'UN') AS point_type,
  COALESCE(LPAD(SUBSTRING(p->>'pointId' FROM '^[A-Z]_[0-9]{4}_[A-Z]+_([0-9]+)$'), 4, '0'), LPAD((idx - 1)::text, 4, '0')) AS point_no,
  COALESCE(NULLIF(p->>'pointName', ''), p->>'pointId', 'unknown') AS name,
  '[]'::jsonb AS props,
  COALESCE(p->'values', '{}'::jsonb) AS values
FROM "objects" o,
  jsonb_array_elements(o.points) WITH ORDINALITY AS t(p, idx)
WHERE jsonb_array_length(o.points) > 0;

--> statement-breakpoint
CREATE UNIQUE INDEX "point_unique_idx" ON "points" USING btree ("object_id","point_type","point_no");--> statement-breakpoint
ALTER TABLE "models" DROP COLUMN "points";--> statement-breakpoint
ALTER TABLE "objects" DROP COLUMN "points";
