import { eq } from "drizzle-orm";
import { db } from "@/config/database";
import { users } from "@/schemas/users";
import type { User } from "@/types/index";

export async function getUsers(): Promise<User[]> {
  const rows = await db.select().from(users);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status as "active" | "inactive",
    lastLogin: r.lastLogin ?? "-",
  }));
}

export async function addUser(user: User): Promise<void> {
  await db.insert(users).values({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
  });
}

export async function removeUser(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result.length > 0;
}
