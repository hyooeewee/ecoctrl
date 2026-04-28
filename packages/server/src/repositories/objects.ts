import { eq } from "drizzle-orm";
import type { BusinessObject } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { objects } from "@/schemas/objects";

export async function findManyObjects(): Promise<BusinessObject[]> {
  const rows = await db.select().from(objects);
  return rows.map((r) => ({
    uuid: r.uuid,
    id: r.id,
    name: r.name,
    modelId: r.modelId,
    modelName: r.modelName,
    points: r.points ?? [],
  }));
}

export async function findObjectById(id: string): Promise<BusinessObject | null> {
  const rows = await db.select().from(objects).where(eq(objects.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    uuid: r.uuid,
    id: r.id,
    name: r.name,
    modelId: r.modelId,
    modelName: r.modelName,
    points: r.points ?? [],
  };
}

export async function findObjectByUuid(uuid: string): Promise<BusinessObject | null> {
  const rows = await db.select().from(objects).where(eq(objects.uuid, uuid)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    uuid: r.uuid,
    id: r.id,
    name: r.name,
    modelId: r.modelId,
    modelName: r.modelName,
    points: r.points ?? [],
  };
}

export async function createObject(data: Omit<BusinessObject, "uuid">): Promise<BusinessObject> {
  const result = await db
    .insert(objects)
    .values({
      id: data.id,
      name: data.name,
      modelId: data.modelId,
      modelName: data.modelName,
      points: data.points,
    })
    .returning();
  const r = result[0];
  return {
    uuid: r.uuid,
    id: r.id,
    name: r.name,
    modelId: r.modelId,
    modelName: r.modelName,
    points: r.points ?? [],
  };
}

export async function deleteObject(uuid: string): Promise<BusinessObject | null> {
  const result = await db.delete(objects).where(eq(objects.uuid, uuid)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    uuid: r.uuid,
    id: r.id,
    name: r.name,
    modelId: r.modelId,
    modelName: r.modelName,
    points: r.points ?? [],
  };
}
