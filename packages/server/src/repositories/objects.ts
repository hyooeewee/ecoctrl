import { eq } from "drizzle-orm";
import type { BusinessObject } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { objects } from "@/schemas/objects";

// NOTE: BusinessObject in @ecoctrl/shared is missing the `status` field.
// Once shared/types/api/objects.ts is updated, remove the `as` casts below.

export async function findManyObjects(): Promise<BusinessObject[]> {
  const rows = await db.select().from(objects);
  return rows.map(
    (r) =>
      ({
        uuid: r.uuid,
        id: r.id,
        name: r.name,
        modelId: r.modelId,
        modelName: r.modelName,
        status: r.status,
        points: r.points ?? [],
      }) as BusinessObject,
  );
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
    status: r.status,
    points: r.points ?? [],
  } as BusinessObject;
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
    status: r.status,
    points: r.points ?? [],
  } as BusinessObject;
}

export async function createObject(data: Omit<BusinessObject, "uuid">): Promise<BusinessObject> {
  const result = await db
    .insert(objects)
    .values({
      id: data.id,
      name: data.name,
      modelId: data.modelId,
      modelName: data.modelName,
      status: (data as unknown as Record<string, string>).status ?? "offline",
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
    status: r.status,
    points: r.points ?? [],
  } as BusinessObject;
}

export async function updateObject(
  uuid: string,
  data: Partial<Omit<BusinessObject, "uuid">>,
): Promise<BusinessObject | null> {
  const result = await db
    .update(objects)
    .set({
      id: data.id,
      name: data.name,
      modelId: data.modelId,
      modelName: data.modelName,
      points: data.points,
    })
    .where(eq(objects.uuid, uuid))
    .returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    uuid: r.uuid,
    id: r.id,
    name: r.name,
    modelId: r.modelId,
    modelName: r.modelName,
    status: r.status,
    points: r.points ?? [],
  } as BusinessObject;
}

export async function createManyObjects(
  dataList: Omit<BusinessObject, "uuid">[],
): Promise<BusinessObject[]> {
  const values = dataList.map((data) => ({
    id: data.id,
    name: data.name,
    modelId: data.modelId,
    modelName: data.modelName,
    status: (data as unknown as Record<string, string>).status ?? "offline",
    points: data.points,
  }));

  const result = await db.insert(objects).values(values).returning();

  return result.map(
    (r) =>
      ({
        uuid: r.uuid,
        id: r.id,
        name: r.name,
        modelId: r.modelId,
        modelName: r.modelName,
        status: r.status,
        points: r.points ?? [],
      }) as BusinessObject,
  );
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
    status: r.status,
    points: r.points ?? [],
  } as BusinessObject;
}
