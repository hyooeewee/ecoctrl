import { eq, inArray, desc, and, sql } from "drizzle-orm";
import { db } from "@/config/database";
import { notifications } from "@/schemas/notifications";

export interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: Date | null;
}

export async function findManyNotifications(): Promise<Notification[]> {
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId ?? null,
    title: r.title,
    message: r.message,
    read: r.read,
    createdAt: r.createdAt,
  }));
}

export async function countUnreadNotifications(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(eq(notifications.read, false));
  return result[0]?.count ?? 0;
}

export async function createNotification(data: {
  userId?: string | null;
  title: string;
  message?: string | null;
}): Promise<Notification> {
  const result = await db
    .insert(notifications)
    .values({
      userId: data.userId ?? null,
      title: data.title,
      message: data.message ?? null,
    })
    .returning();
  const r = result[0];
  return {
    id: r.id,
    userId: r.userId ?? null,
    title: r.title,
    message: r.message,
    read: r.read,
    createdAt: r.createdAt,
  };
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  const result = await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id))
    .returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    userId: r.userId ?? null,
    title: r.title,
    message: r.message,
    read: r.read,
    createdAt: r.createdAt,
  };
}

export async function markNotificationsRead(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await db
    .update(notifications)
    .set({ read: true })
    .where(and(inArray(notifications.id, ids), eq(notifications.read, false)))
    .returning();
  return result.length;
}

export async function deleteAllNotifications(): Promise<number> {
  const result = await db.delete(notifications).returning();
  return result.length;
}
