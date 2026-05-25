-- Destructive schema rebuild for models/objects/points
-- Data will be lost; re-import after migration

TRUNCATE TABLE "points" CASCADE;
TRUNCATE TABLE "objects" CASCADE;
TRUNCATE TABLE "models" CASCADE;

-- models: rename device_type -> code, add description, make fields nullable
ALTER TABLE "models" RENAME COLUMN "device_type" TO "code";
ALTER TABLE "models" ADD COLUMN "description" varchar(500);
ALTER TABLE "models" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "models" ALTER COLUMN "version" DROP NOT NULL;
ALTER TABLE "models" ALTER COLUMN "format" DROP NOT NULL;
ALTER TABLE "models" ALTER COLUMN "size" DROP NOT NULL;
ALTER TABLE "models" ADD CONSTRAINT "models_code_unique" UNIQUE("code");

-- objects: uuid -> id (pk), id -> code, drop model_name, add description
ALTER TABLE "objects" RENAME COLUMN "uuid" TO "id_old";
ALTER TABLE "objects" RENAME COLUMN "id" TO "code";
ALTER TABLE "objects" RENAME COLUMN "id_old" TO "id";
ALTER TABLE "objects" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;
ALTER TABLE "objects" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "objects" ADD PRIMARY KEY ("id");
ALTER TABLE "objects" DROP COLUMN "model_name";
ALTER TABLE "objects" ADD COLUMN "description" varchar(500);
ALTER TABLE "objects" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "objects" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "objects" ALTER COLUMN "status" SET DEFAULT 'offline';
ALTER TABLE "objects" ADD CONSTRAINT "object_model_code_idx" UNIQUE ("model_id", "code");

-- points: rename columns, drop old FK, add new FK, update unique index
ALTER TABLE "points" RENAME COLUMN "point_type" TO "type";
ALTER TABLE "points" RENAME COLUMN "point_no" TO "code";
ALTER TABLE "points" ADD COLUMN "description" varchar(500);
ALTER TABLE "points" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "points" DROP CONSTRAINT IF EXISTS "points_object_id_objects_uuid_fk";
DROP INDEX IF EXISTS "point_unique_idx";
ALTER TABLE "points" ADD CONSTRAINT "points_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "point_object_type_code_idx" ON "points" USING btree ("object_id","type","code");
