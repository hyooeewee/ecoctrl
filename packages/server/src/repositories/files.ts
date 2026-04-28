import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { files } from "@/schemas/files";

export interface FileItem {
  id: string;
  name: string;
  filename: string;
  mimeType: string | null;
  size: number;
  fileUrl: string | null;
  createdAt: string | null;
}

export async function findManyFiles(): Promise<FileItem[]> {
  const rows = await db.select().from(files);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    filename: r.filename,
    mimeType: r.mimeType ?? null,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  }));
}

export async function findFileById(id: string): Promise<FileItem | null> {
  const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    filename: r.filename,
    mimeType: r.mimeType ?? null,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  };
}

export async function createFile(data: Omit<FileItem, "id" | "createdAt">): Promise<FileItem> {
  const result = await db
    .insert(files)
    .values({
      name: data.name,
      filename: data.filename,
      mimeType: data.mimeType,
      size: data.size,
      fileUrl: data.fileUrl,
    })
    .returning();
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    filename: r.filename,
    mimeType: r.mimeType ?? null,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  };
}

export async function findFileByUrl(fileUrl: string): Promise<FileItem | null> {
  const rows = await db.select().from(files).where(eq(files.fileUrl, fileUrl)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    name: r.name,
    filename: r.filename,
    mimeType: r.mimeType ?? null,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  };
}

export async function updateFile(
  id: string,
  data: Partial<Pick<FileItem, "name">>,
): Promise<FileItem | null> {
  const result = await db
    .update(files)
    .set({ name: data.name })
    .where(eq(files.id, id))
    .returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    filename: r.filename,
    mimeType: r.mimeType ?? null,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  };
}

export async function deleteFile(id: string): Promise<FileItem | null> {
  const result = await db.delete(files).where(eq(files.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    name: r.name,
    filename: r.filename,
    mimeType: r.mimeType ?? null,
    size: r.size,
    fileUrl: r.fileUrl ?? null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : null,
  };
}
