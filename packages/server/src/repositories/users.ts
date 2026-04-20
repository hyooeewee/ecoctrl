import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { users } from "@/schemas/users";
import type { User, UserRole, UserStatus } from "@ecoctrl/shared";

export async function getUsers(): Promise<User[]> {
  const rows = await db.select().from(users);
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role as UserRole,
    status: r.status as UserStatus,
    lastLogin: r.lastLogin,
    avatarUrl: r.avatarUrl,
  }));
}

export async function addUser(user: User): Promise<void> {
  await db.insert(users).values({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
    avatarUrl: user.avatarUrl,
  });
}

export async function removeUser(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result.length > 0;
}

export async function getOnlineUser(): Promise<{ id: string; username: string } | null> {
  const rows = await db.select().from(users).where(eq(users.status, "online")).limit(1);
  if (rows.length === 0) {
    return null;
  }
  return { id: rows[0].id, username: rows[0].username };
}

export async function updateUser(
  id: string,
  data: Partial<{ username: string; password: string; email: string; role: string; status: string; avatarUrl: string | null }>,
): Promise<boolean> {
  const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return result.length > 0;
}
