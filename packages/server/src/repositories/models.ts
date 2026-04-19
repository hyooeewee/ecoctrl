import { db } from "@/config/database";
import { models } from "@/schemas/models";

export interface ModelItem {
  id: string;
  name: string;
  version: string;
  format: string;
  size: string;
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
    thumbnailUrl: r.thumbnailUrl ?? null,
    docUrl: r.docUrl ?? null,
  }));
}

export async function saveModels(data: ModelItem[]): Promise<void> {
  await db.delete(models);
  if (data.length) {
    await db.insert(models).values(
      data.map((d) => ({
        id: d.id,
        name: d.name,
        version: d.version,
        format: d.format,
        size: d.size,
        thumbnailUrl: d.thumbnailUrl,
        docUrl: d.docUrl,
      })),
    );
  }
}
