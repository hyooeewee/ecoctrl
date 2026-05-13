import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/config/database";
import { users } from "@/schemas/users";
import { findPlatformConfig } from "@/repositories/platformConfig";
import { createUser } from "@/repositories/users";

function generateRandomPassword(length = 12): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export async function initAdmin(): Promise<void> {
  // Ensure platform config exists (auto-inserts defaults on first read)
  await findPlatformConfig();

  const userRows = await db.select({ id: users.id }).from(users).limit(1);
  if (userRows.length > 0) {
    return; // Users already exist, skip initialization
  }

  const rawPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim() || generateRandomPassword();
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  await createUser({
    username: "admin",
    email: "admin@localhost",
    password: hashedPassword,
    role: "super_admin",
    status: "online",
    lastLogin: null,
    avatarUrl: null,
  });

  if (process.env.INITIAL_ADMIN_PASSWORD) {
    console.log("[INIT] Default admin created: admin / (from ADMIN_PASSWORD env)");
  } else {
    console.log(`[INIT] Default admin created: admin / ${rawPassword}`);
    console.log("[INIT] Set ADMIN_PASSWORD env var to specify a custom initial password.");
  }
}
