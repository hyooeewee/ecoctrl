import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { models } from "@/schemas/models";

export interface ModelItem {
  id: string;
  name: string;
  version: string;
  format: string;
  size: string;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  docUrl: string | null;
}

export async function getModels(): Promise<ModelItem[]> {
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

export async function getModelById(id: string): Promise<ModelItem | null> {
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

export async function addModel(data: Omit<ModelItem, "id">): Promise<string> {
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
    .returning({ id: models.id });
  return result[0].id;
}

export async function deleteModel(id: string): Promise<boolean> {
  const result = await db.delete(models).where(eq(models.id, id)).returning();
  return result.length > 0;
}
