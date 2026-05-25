import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { intro, isCancel, multiselect, outro } from "@clack/prompts";
import * as schema from "@/schemas/index";
import { ensureDatabase } from "@/lib/ensureDatabase";
import { migrateDatabase } from "@/lib/migrateDatabase";
import { ensureS3Buckets, getPetStorage, getPluginStorage } from "@/storage";
import type { PluginManifest } from "@/engine/plugin-types";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const ADMIN_USER = process.env.INIT_ADMIN_USERNAME?.trim() || "admin";
const ADMIN_PASS = process.env.INIT_ADMIN_PASSWORD?.trim() || crypto.randomUUID();
const ADMIN_EMAIL = process.env.INIT_ADMIN_EMAIL?.trim() || "admin@example.com";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Module definitions ───────────────────────────────────────────

interface InitModule {
  value: string;
  label: string;
  forceable: boolean;
  run: (force: boolean) => Promise<void>;
}

// ─── CLI parsing ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlyModules = onlyArg ? onlyArg.slice(7).split(",") : null;
const force = args.includes("--force") || args.includes("-f");

// ─── Helper functions ─────────────────────────────────────────────

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function resolveAssetDir(scriptDir: string, subdir: string): Promise<string> {
  const candidates = [path.join(scriptDir, subdir), path.join(scriptDir, "../assets", subdir)];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {}
  }
  return candidates[0];
}

// ─── Init functions ───────────────────────────────────────────────

async function initMigrate(_force: boolean) {
  console.log("[init] ensuring database exists...");
  await ensureDatabase();
  console.log("[init] running migrations...");
  await migrateDatabase();
  console.log("[init] migrations done");
}

async function initS3Buckets(_force: boolean) {
  if (process.env.STORAGE_PROVIDER !== "minio") {
    console.log("[init] storage provider is not minio, skipping S3 bucket init");
    return;
  }

  await ensureS3Buckets();
  console.log("[init] ensured S3 buckets");
}

async function initBuiltInNodes(force = false) {
  const baseDir = await resolveAssetDir(__dirname, "built-in-nodes");

  const storage = getPluginStorage();
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory());

  for (const dir of pluginDirs) {
    const pluginDir = path.join(baseDir, dir.name);
    const manifestPath = path.join(pluginDir, "manifest.json");

    if (!(await fileExists(manifestPath))) {
      console.warn(`[init] built-in node "${dir.name}" missing manifest.json, skipping`);
      continue;
    }

    const manifestRaw = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw) as PluginManifest;
    const buildKey = (filename: string) => `plugins/${manifest.id}/${manifest.version}/${filename}`;

    const exists = await storage.exists(buildKey("manifest.json"));
    if (exists && !force) {
      console.log(
        `[init] built-in node ${manifest.id}@${manifest.version} already seeded, skipping`,
      );
      continue;
    }

    if (exists && force) {
      console.log(
        `[init] built-in node ${manifest.id}@${manifest.version} already seeded, force overwriting`,
      );
    }

    await storage.put(buildKey("manifest.json"), Buffer.from(manifestRaw));
    await storage.put(
      buildKey(manifest.entry),
      await fs.readFile(path.join(pluginDir, manifest.entry)),
    );
    await storage.put(
      buildKey(manifest.schema),
      await fs.readFile(path.join(pluginDir, manifest.schema)),
    );

    if (manifest.icon) {
      const iconPath = path.join(pluginDir, manifest.icon);
      if (await fileExists(iconPath)) {
        await storage.put(buildKey(manifest.icon), await fs.readFile(iconPath));
      }
    }

    console.log(`[init] seeded built-in node ${manifest.id}@${manifest.version}`);
  }
}

async function initBuiltInPets(force = false) {
  const builtInDir = await resolveAssetDir(__dirname, "built-in-pets");
  const storage = getPetStorage();

  try {
    const entries = await fs.readdir(builtInDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    for (const dir of dirs) {
      const petDir = path.join(builtInDir, dir.name);
      const petJsonPath = path.join(petDir, "pet.json");
      const spritesheetPath = path.join(petDir, "spritesheet.webp");

      try {
        await fs.access(petJsonPath);
        await fs.access(spritesheetPath);
      } catch {
        console.warn(`[init] built-in pet ${dir.name} missing files, skipping`);
        continue;
      }

      const petJsonKey = `${dir.name}/pet.json`;
      const spritesheetKey = `${dir.name}/spritesheet.webp`;
      const petJsonExists = await storage.exists(petJsonKey);

      if (petJsonExists && !force) {
        console.log(`[init] built-in pet ${dir.name} already seeded, skipping`);
        continue;
      }

      if (petJsonExists && force) {
        console.log(`[init] built-in pet ${dir.name} already seeded, force overwriting`);
      }

      const petJsonBuffer = await fs.readFile(petJsonPath);
      const spritesheetBuffer = await fs.readFile(spritesheetPath);

      await storage.put(petJsonKey, petJsonBuffer, {
        contentType: "application/json",
        contentLength: petJsonBuffer.length,
      });
      await storage.put(spritesheetKey, spritesheetBuffer, {
        contentType: "image/webp",
        contentLength: spritesheetBuffer.length,
      });

      console.log(`[init] uploaded built-in pet: ${dir.name}`);
    }
  } catch {
    // assets/built-in-pets directory may not exist
  }
}

async function initUsers(force = false) {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, ADMIN_USER));

  if (existing.length > 0 && !force) {
    console.log(`[init] user "${ADMIN_USER}" already exists, skipping`);
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASS, 10);

  if (existing.length > 0 && force) {
    await db
      .update(schema.users)
      .set({
        password: hash,
        email: ADMIN_EMAIL,
        role: "super_admin",
        status: "online",
      })
      .where(eq(schema.users.username, ADMIN_USER));
    console.log(`[init] updated super_admin: ${ADMIN_USER}`);
  } else {
    await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      username: ADMIN_USER,
      email: ADMIN_EMAIL,
      password: hash,
      role: "super_admin",
      status: "online",
    });
    console.log(`[init] created super_admin: ${ADMIN_USER} (${ADMIN_EMAIL})`);
  }

  if (!process.env.INIT_ADMIN_PASSWORD) {
    console.log(`[init] generated random password: ${ADMIN_PASS}`);
  }
}

async function initPlatformConfig(force = false) {
  const existing = await db.select().from(schema.platformConfigs).limit(1);

  if (existing.length > 0 && !force) {
    console.log("[init] platform_configs already seeded, skipping");
    return;
  }

  const values = {
    platformName: "EcoCtrl 能管平台",
    refreshInterval: 30,
    realtimeAlertEnabled: true,
    timezone: "Asia/Shanghai",
    autoBackup: true,
    backupRetentionDays: 30,
    sessionTimeout: 30,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: false,
    allowRegistration: false,
    allowPasswordReset: false,
    allowOAuthLogin: false,
    systemPrompt:
      "你是蓝宝，EcoCtrl 能源管理平台的智能助手。\n\n平台能力：\n\n- 三维建筑能耗可视化（BabylonJS）\n- 实时监控暖通空调、照明、电梯、服务器等设备状态\n- 能耗数据分析与 AI 优化建议\n- 实时告警管理\n\n回复风格：\n\n- 使用中文回复\n- 简洁、专业、友好\n- 需要调用工具时直接调用，不要告知用户你在调用工具\n- 对于不确定的问题，坦诚说明不要编造",
  };

  if (existing.length > 0 && force) {
    await db
      .update(schema.platformConfigs)
      .set(values)
      .where(eq(schema.platformConfigs.id, existing[0].id));
    console.log("[init] updated platform config");
  } else {
    await db.insert(schema.platformConfigs).values(values);
    console.log("[init] created default platform config");
  }
}

// ─── Module registry ──────────────────────────────────────────────

const MODULES: InitModule[] = [
  { value: "migrate", label: "数据库迁移 (migrate)", forceable: false, run: initMigrate },
  { value: "buckets", label: "S3 存储桶 (buckets)", forceable: false, run: initS3Buckets },
  {
    value: "nodes",
    label: "内置工作流节点 (nodes)",
    forceable: true,
    run: initBuiltInNodes,
  },
  { value: "pets", label: "内置宠物 (pets)", forceable: true, run: initBuiltInPets },
  { value: "users", label: "默认管理员 (users)", forceable: true, run: initUsers },
  { value: "config", label: "平台配置 (config)", forceable: true, run: initPlatformConfig },
];

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  intro("ecoctrl db:init");

  if (force) {
    console.log("[init] --force flag set, will overwrite existing data where applicable");
  }

  // Select modules
  let selected: string[];
  if (onlyModules) {
    const valid = MODULES.map((m) => m.value);
    const invalid = onlyModules.filter((m) => !valid.includes(m));
    if (invalid.length > 0) {
      console.error(`[init] unknown modules: ${invalid.join(", ")}`);
      console.error(`[init] valid modules: ${valid.join(", ")}`);
      process.exit(1);
    }
    selected = onlyModules;
  } else if (process.stdin.isTTY) {
    const result = await multiselect({
      message: "Select modules to initialize (space toggle, 'a' all, enter confirm):",
      options: MODULES.map((m) => ({ value: m.value, label: m.label })),
      required: true,
    });
    if (isCancel(result)) {
      outro("Cancelled.");
      process.exit(0);
    }
    selected = result as string[];
  } else {
    // Non-TTY (Docker): run all
    selected = MODULES.map((m) => m.value);
  }

  console.log(`[init] selected modules: ${selected.join(", ")}`);

  // Execute in order
  for (const mod of MODULES) {
    if (!selected.includes(mod.value)) continue;
    try {
      const shouldForce = force && mod.forceable;
      await mod.run(shouldForce);
    } catch (err) {
      console.error(`[init] failed at module "${mod.value}":`, err);
      process.exit(1);
    }
  }

  await client.end();
  outro("[init] done");
}

main().catch((err) => {
  console.error("[init] failed:", err);
  process.exit(1);
});
