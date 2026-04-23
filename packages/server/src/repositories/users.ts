import { eq, or } from "drizzle-orm";
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

export async function addUser(user: User & { password?: string | null }): Promise<void> {
  await db.insert(users).values({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
    avatarUrl: user.avatarUrl,
    password: user.password ?? null,
  });
}

export async function findUserByIdentifier(
  identifier: string,
): Promise<
  | {
      id: string;
      username: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      password: string | null;
      status: string;
    }
  | null
> {
  const rows = await db
    .select()
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role,
    avatarUrl: r.avatarUrl,
    password: r.password,
    status: r.status,
  };
}

export async function getUserByUsername(
  username: string,
): Promise<
  | {
      id: string;
      username: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      password: string | null;
      status: string;
    }
  | null
> {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role,
    avatarUrl: r.avatarUrl,
    password: r.password,
    status: r.status,
  };
}

export async function getUserByEmail(
  email: string,
): Promise<
  | {
      id: string;
      username: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      password: string | null;
      status: string;
    }
  | null
> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role,
    avatarUrl: r.avatarUrl,
    password: r.password,
    status: r.status,
  };
}

export async function getUserById(
  id: string,
): Promise<
  | {
      id: string;
      username: string;
      email: string;
      role: string;
      avatarUrl: string | null;
    }
  | null
> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role,
    avatarUrl: r.avatarUrl,
  };
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
