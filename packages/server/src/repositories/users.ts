import { eq, or } from "drizzle-orm";
import { db } from "@/config/database";
import { users } from "@/schemas/users";
import type { User, UserRole, UserStatus, UserPreferences } from "@ecoctrl/shared";

export async function findManyUsers(): Promise<User[]> {
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

export async function createUser(user: User & { password?: string | null }): Promise<User> {
  const result = await db.insert(users).values({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
    avatarUrl: user.avatarUrl,
    password: user.password ?? null,
  }).returning();
  const r = result[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role as UserRole,
    status: r.status as UserStatus,
    lastLogin: r.lastLogin,
    avatarUrl: r.avatarUrl,
  };
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

export async function findUserByUsername(
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

export async function findUserByEmail(
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

export async function findUserById(
  id: string,
): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role as UserRole,
    status: r.status as UserStatus,
    lastLogin: r.lastLogin,
    avatarUrl: r.avatarUrl,
  };
}

export async function findUserByIdOrThrow(id: string): Promise<User> {
  const user = await findUserById(id);
  if (!user) throw new Error(`User not found: ${id}`);
  return user;
}

export async function findUserByIdWithPassword(
  id: string,
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
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
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

export async function deleteUser(id: string): Promise<User | null> {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role as UserRole,
    status: r.status as UserStatus,
    lastLogin: r.lastLogin,
    avatarUrl: r.avatarUrl,
  };
}

export async function findOnlineUser(): Promise<{ id: string; username: string } | null> {
  const rows = await db.select().from(users).where(eq(users.status, "online")).limit(1);
  if (rows.length === 0) {
    return null;
  }
  return { id: rows[0].id, username: rows[0].username };
}

export async function updateUser(
  id: string,
  data: Partial<{ username: string; password: string; email: string; role: string; status: string; avatarUrl: string | null; preferences: UserPreferences }>,
): Promise<User | null> {
  const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role as UserRole,
    status: r.status as UserStatus,
    lastLogin: r.lastLogin,
    avatarUrl: r.avatarUrl,
  };
}

export async function findUserPreferences(id: string): Promise<UserPreferences> {
  const rows = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, id)).limit(1);
  if (rows.length === 0) return {};
  return (rows[0].preferences ?? {}) as UserPreferences;
}

export async function updateUserPreferences(
  id: string,
  data: UserPreferences,
): Promise<UserPreferences> {
  const result = await db
    .update(users)
    .set({ preferences: data })
    .where(eq(users.id, id))
    .returning();
  if (result.length === 0) return {};
  return (result[0].preferences ?? {}) as UserPreferences;
}
