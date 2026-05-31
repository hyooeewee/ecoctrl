import { spawn } from "node:child_process";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";
import { confirm, intro, isCancel, multiselect, outro } from "@clack/prompts";
import * as schema from "@/schemas/index";
import { getFileStorage, getModelStorage, getPetStorage, getPluginStorage } from "@/storage";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

// ========================================
// Module definitions
// ========================================

interface CleanupModule {
  value: string;
  label: string;
  dangerous: boolean;
  run: () => Promise<void>;
}

// ========================================
// CLI parsing
// ========================================

const args = process.argv.slice(2);
const filterArg = args.find((a) => a.startsWith("--filter="));
const filteredModules = filterArg ? filterArg.slice(9).split(",") : null;
const yes = args.includes("--yes") || args.includes("-y");

// ========================================
// Cleanup functions
// ========================================

async function clearData() {
  console.log("[cleanup] resetting all table data...");
  await reset(db, schema);
  console.log("[cleanup] all table data cleared");
}

async function dropTables() {
  console.log("[cleanup] dropping all tables...");
  await client.unsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  console.log("[cleanup] all tables dropped, running drizzle-kit push...");

  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["drizzle-kit", "push", "--force"], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`drizzle-kit push exited with code ${code}`));
      }
    });
  });
  console.log("[cleanup] tables recreated via drizzle-kit push");
}

async function clearStorageItems(
  listFn: () => Promise<string[]>,
  deleteFn: (key: string) => Promise<void>,
  name: string,
) {
  console.log(`[cleanup] clearing ${name}...`);
  try {
    const keys = await listFn();
    if (keys.length === 0) {
      console.log(`[cleanup] ${name} is already empty`);
      return;
    }
    for (const key of keys) {
      await deleteFn(key);
    }
    console.log(`[cleanup] cleared ${keys.length} objects from ${name}`);
  } catch (err) {
    console.error(`[cleanup] failed to clear ${name}:`, err);
    throw err;
  }
}

async function clearNodes() {
  const storage = getPluginStorage();
  await clearStorageItems(
    () => storage.list(""),
    (key) => storage.delete(key),
    "MinIO plugins",
  );
}

async function clearPets() {
  const storage = getPetStorage();
  await clearStorageItems(
    () => storage.list(""),
    (key) => storage.delete(key),
    "MinIO pets",
  );
}

async function clearFiles() {
  const storage = getFileStorage();
  await clearStorageItems(
    () => storage.list(""),
    (key) => storage.delete(key),
    "MinIO files",
  );
}

async function clearModels() {
  const storage = getModelStorage();
  await clearStorageItems(
    () => storage.list(""),
    (key) => storage.delete(key),
    "MinIO models",
  );
}

async function clearAllStorage() {
  await clearNodes();
  await clearPets();
  await clearFiles();
  await clearModels();
}

async function deleteBuckets() {
  console.log("[cleanup] clearing objects and deleting S3 buckets...");

  for (const [name, getStorage] of [
    ["plugins", getPluginStorage],
    ["pets", getPetStorage],
    ["files", getFileStorage],
    ["models", getModelStorage],
  ] as const) {
    const storage = getStorage();
    try {
      const keys = await storage.list("");
      for (const key of keys) {
        await storage.delete(key);
      }
      await storage.deleteBucket();
      console.log(`[cleanup] deleted bucket: ${name}`);
    } catch (err: any) {
      if (err.name === "NoSuchBucket" || err.$metadata?.httpStatusCode === 404) {
        console.log(`[cleanup] bucket ${name} does not exist, skipping`);
      } else {
        throw err;
      }
    }
  }
}

async function dropDatabase() {
  const dbUrl = process.env.DATABASE_URL!;
  const dbName = dbUrl.split("/").pop() || "ecoctrl";
  const adminUrl = dbUrl.replace(/\/[^/]+$/, "/postgres");

  const adminSql = postgres(adminUrl, { max: 1 });

  console.log(`[cleanup] terminating connections to ${dbName}...`);
  await adminSql.unsafe(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${dbName}'
      AND pid <> pg_backend_pid()
  `);

  console.log(`[cleanup] dropping database ${dbName}...`);
  await adminSql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);

  console.log(`[cleanup] creating database ${dbName}...`);
  await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);

  console.log(`[cleanup] database ${dbName} recreated`);
  await adminSql.end();
}

// ========================================
// Module registry
// ========================================

const MODULES: CleanupModule[] = [
  {
    value: "data",
    label: "清空所有表数据 (data)",
    dangerous: false,
    run: clearData,
  },
  {
    value: "tables",
    label: "删除所有表并重新 Push (tables)",
    dangerous: true,
    run: dropTables,
  },
  {
    value: "nodes",
    label: "清空 MinIO 内置节点 (nodes)",
    dangerous: false,
    run: clearNodes,
  },
  {
    value: "pets",
    label: "清空 MinIO 宠物资源 (pets)",
    dangerous: false,
    run: clearPets,
  },
  {
    value: "files",
    label: "清空 MinIO 文件存储 (files)",
    dangerous: false,
    run: clearFiles,
  },
  {
    value: "models",
    label: "清空 MinIO 模型存储 (models)",
    dangerous: false,
    run: clearModels,
  },
  {
    value: "storage",
    label: "清空所有 MinIO 存储 (storage)",
    dangerous: false,
    run: clearAllStorage,
  },
  {
    value: "buckets",
    label: "删除 MinIO 存储桶 (buckets)",
    dangerous: true,
    run: deleteBuckets,
  },
  {
    value: "db",
    label: "删除并重建数据库 (db)",
    dangerous: true,
    run: dropDatabase,
  },
];

// ========================================
// Main
// ========================================

async function main() {
  intro("ecoctrl db:cleanup");

  // Select modules
  let selected: string[];
  if (filteredModules) {
    const valid = MODULES.map((m) => m.value);
    const invalid = filteredModules.filter((m) => !valid.includes(m));
    if (invalid.length > 0) {
      console.error(`[cleanup] unknown modules: ${invalid.join(", ")}`);
      console.error(`[cleanup] valid modules: ${valid.join(", ")}`);
      process.exit(1);
    }
    selected = filteredModules;
  } else if (process.stdin.isTTY) {
    const result = await multiselect({
      message: "Select modules to cleanup (space toggle, 'a' all, enter confirm):",
      options: MODULES.map((m) => ({ value: m.value, label: m.label })),
      required: true,
    });
    if (isCancel(result)) {
      outro("Cancelled.");
      process.exit(0);
    }
    selected = result as string[];
  } else {
    // Non-TTY: require explicit --filter
    console.error(
      "[cleanup] non-interactive mode requires --filter flag. Use --yes to skip confirmations.",
    );
    console.error(`[cleanup] valid modules: ${MODULES.map((m) => m.value).join(", ")}`);
    process.exit(1);
  }

  // Confirm dangerous operations
  const dangerousSelected = MODULES.filter((m) => selected.includes(m.value) && m.dangerous);
  if (dangerousSelected.length > 0 && !yes) {
    const names = dangerousSelected.map((m) => m.label).join(", ");
    const confirmed = await confirm({
      message: `Dangerous operations selected: ${names}. Continue?`,
      initialValue: false,
    });
    if (isCancel(confirmed) || !confirmed) {
      outro("Cancelled.");
      process.exit(0);
    }
  }

  console.log(`[cleanup] selected modules: ${selected.join(", ")}`);

  // Execute in order
  for (const mod of MODULES) {
    if (!selected.includes(mod.value)) continue;
    try {
      await mod.run();
    } catch (err) {
      console.error(`[cleanup] failed at module "${mod.value}":`, err);
      process.exit(1);
    }
  }

  await client.end();
  outro("[cleanup] done");
}

main().catch((err) => {
  console.error("[cleanup] failed:", err);
  process.exit(1);
});
