import { eq } from "drizzle-orm";
import type { DataModel } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { models } from "@/schemas/models";

export async function findManyModels(): Promise<DataModel[]> {
  const rows = await db.select().from(models);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    deviceType: r.deviceType,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  }));
}

export async function findModelById(id: string): Promise<DataModel | null> {
  const rows = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    deviceType: r.deviceType,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}

export async function findModelByName(name: string): Promise<DataModel | null> {
  const rows = await db.select().from(models).where(eq(models.name, name)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    deviceType: r.deviceType,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}

export async function createModel(data: Omit<DataModel, "id">): Promise<DataModel> {
  const result = await db
    .insert(models)
    .values({
      name: data.name,
      version: data.version,
      format: data.format,
      size: data.size,
      deviceType: data.deviceType,
      fileUrl: data.fileUrl,
      thumbnailUrl: data.thumbnailUrl,
      docUrl: data.docUrl,
    })
    .returning();
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    deviceType: r.deviceType,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}

export async function updateModel(
  id: string,
  data: Partial<Pick<DataModel, "name" | "version" | "format" | "size" | "fileUrl" | "deviceType">>,
): Promise<DataModel | null> {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.version !== undefined) updateData.version = data.version;
  if (data.format !== undefined) updateData.format = data.format;
  if (data.size !== undefined) updateData.size = data.size;
  if (data.deviceType !== undefined) updateData.deviceType = data.deviceType;
  if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;

  const result = await db.update(models).set(updateData).where(eq(models.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    deviceType: r.deviceType,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}

export async function deleteModel(id: string): Promise<DataModel | null> {
  const result = await db.delete(models).where(eq(models.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    deviceType: r.deviceType,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}
