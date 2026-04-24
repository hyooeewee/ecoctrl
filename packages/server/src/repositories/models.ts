import { eq } from "drizzle-orm";
import type { Model3D } from "@ecoctrl/shared";
import { db } from "@/config/database";
import { models } from "@/schemas/models";

export async function findManyModels(): Promise<Model3D[]> {
  const rows = await db.select().from(models);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  }));
}

export async function findModelById(id: string): Promise<Model3D | null> {
  const rows = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}

export async function createModel(data: Omit<Model3D, "id">): Promise<Model3D> {
  const result = await db
    .insert(models)
    .values({
      name: data.name,
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
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}

export async function deleteModel(id: string): Promise<Model3D | null> {
  const result = await db.delete(models).where(eq(models.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    version: r.version,
    format: r.format,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  };
}
