import { eq } from "drizzle-orm";
import type { DataModel } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { models } from "@/schemas/models";

export async function findManyModels(): Promise<DataModel[]> {
  const rows = await db.select().from(models);
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl,
    thumbnailUrl: r.thumbnailUrl,
    docUrl: r.docUrl,
  }));
}

export async function findModelById(id: string): Promise<DataModel | null> {
  const rows = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl,
    thumbnailUrl: r.thumbnailUrl,
    docUrl: r.docUrl,
  };
}

export async function findModelByCode(code: string): Promise<DataModel | null> {
  const rows = await db.select().from(models).where(eq(models.code, code)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl,
    thumbnailUrl: r.thumbnailUrl,
    docUrl: r.docUrl,
  };
}

export async function createModel(data: Omit<DataModel, "id">): Promise<DataModel> {
  const result = await db
    .insert(models)
    .values({
      code: data.code,
      name: data.name,
      description: data.description,
      version: data.version,
      format: data.format,
      size: data.size,
      fileUrl: data.fileUrl,
      thumbnailUrl: data.thumbnailUrl,
      docUrl: data.docUrl,
    })
    .returning();
  const r = result[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl,
    thumbnailUrl: r.thumbnailUrl,
    docUrl: r.docUrl,
  };
}

export async function updateModel(
  id: string,
  data: Partial<Omit<DataModel, "id">>,
): Promise<DataModel | null> {
  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.version !== undefined) updateData.version = data.version;
  if (data.format !== undefined) updateData.format = data.format;
  if (data.size !== undefined) updateData.size = data.size;
  if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;

  const result = await db.update(models).set(updateData).where(eq(models.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl,
    thumbnailUrl: r.thumbnailUrl,
    docUrl: r.docUrl,
  };
}

export async function deleteModel(id: string): Promise<DataModel | null> {
  const result = await db.delete(models).where(eq(models.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl,
    thumbnailUrl: r.thumbnailUrl,
    docUrl: r.docUrl,
  };
}
