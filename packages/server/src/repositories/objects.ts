import { eq, and } from "drizzle-orm";
import type { BusinessObject } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { objects } from "@/schemas/objects";

export async function findManyObjects(): Promise<BusinessObject[]> {
  const rows = await db.select().from(objects);
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  }));
}

export async function findObjectById(id: string): Promise<BusinessObject | null> {
  const rows = await db.select().from(objects).where(eq(objects.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  };
}

export async function findObjectByCode(code: string): Promise<BusinessObject | null> {
  const rows = await db.select().from(objects).where(eq(objects.code, code)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  };
}

export async function findObjectByCodeAndModelId(
  code: string,
  modelId: string,
): Promise<BusinessObject | null> {
  const rows = await db
    .select()
    .from(objects)
    .where(and(eq(objects.code, code), eq(objects.modelId, modelId)))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  };
}

export async function createObject(data: Omit<BusinessObject, "id">): Promise<BusinessObject> {
  const result = await db
    .insert(objects)
    .values({
      code: data.code,
      name: data.name,
      description: data.description,
      modelId: data.modelId,
      status: data.status ?? "offline",
    })
    .returning();
  const r = result[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  };
}

export async function updateObject(
  id: string,
  data: Partial<Omit<BusinessObject, "id">>,
): Promise<BusinessObject | null> {
  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.modelId !== undefined) updateData.modelId = data.modelId;
  if (data.status !== undefined) updateData.status = data.status;

  const result = await db.update(objects).set(updateData).where(eq(objects.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  };
}

export async function createManyObjects(
  dataList: Omit<BusinessObject, "id">[],
): Promise<BusinessObject[]> {
  const values = dataList.map((data) => ({
    code: data.code,
    name: data.name,
    description: data.description,
    modelId: data.modelId,
    status: data.status ?? "offline",
  }));

  const result = await db.insert(objects).values(values).returning();

  return result.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  }));
}

export async function deleteObject(id: string): Promise<BusinessObject | null> {
  const result = await db.delete(objects).where(eq(objects.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    modelId: r.modelId,
    status: r.status ?? undefined,
  };
}
