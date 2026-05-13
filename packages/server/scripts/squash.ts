import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
  spinner,
} from "@clack/prompts";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

function env(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} not found in environment`);
  }
  return value;
}

const DB_URL = env("DATABASE_URL");
const DRIZZLE_DIR = path.join(process.cwd(), "drizzle");

function getBaseUrl(dbUrl: string): string {
  const url = new URL(dbUrl);
  return `${url.protocol}//${url.username}:${url.password}@${url.host}`;
}

async function findLeftoverDatabases(sql: postgres.Sql): Promise<string[]> {
  const rows = await sql`
    SELECT datname FROM pg_database WHERE datname LIKE 'ecoctrl_squash_%'
  `;
  return rows.map((r) => r.datname as string);
}

function pruneOldBackups(dir: string, keep: number): void {
  const entries = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("drizzle.") && name.endsWith(".bak"))
    .map((name) => ({
      name,
      time: Number(name.split(".")[1]) || 0,
      path: path.join(dir, name),
    }))
    .filter((e) => fs.statSync(e.path).isDirectory())
    .toSorted((a, b) => b.time - a.time);

  for (const entry of entries.slice(keep)) {
    fs.rmSync(entry.path, { recursive: true, force: true });
  }
}

async function main() {
  intro("ecoctrl  db:squash");

  const proceed = await confirm({
    message:
      "This will replace all migration files with a single squashed migration. A backup will be created automatically. Continue?",
    initialValue: true,
  });

  if (isCancel(proceed) || !proceed) {
    cancel("Operation cancelled. No changes were made.");
    process.exit(0);
  }

  const hasProdData = await confirm({
    message:
      "Do you have production data or environments relying on incremental migration history?",
    initialValue: false,
  });

  if (isCancel(hasProdData) || hasProdData) {
    cancel("Cancelled. Squash is intended for development environments only.");
    process.exit(0);
  }

  const baseUrl = getBaseUrl(DB_URL);
  const tempDb = `ecoctrl_squash_${Date.now()}`;

  // Connect to default 'postgres' database to create/drop databases
  const sql = postgres(`${baseUrl}/postgres`, { max: 1 });
  const s = spinner();

  // Check and clean up leftover temp databases from previous interrupted runs
  const leftovers = await findLeftoverDatabases(sql);
  if (leftovers.length > 0) {
    const action = await select({
      message: `Found ${leftovers.length} leftover temp database(s) from previous runs.`,
      options: [
        { value: "all", label: `Delete all (${leftovers.length})` },
        { value: "select", label: "Choose which to delete" },
        { value: "skip", label: "Skip (keep them)" },
      ],
    });

    if (isCancel(action)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    if (action === "all") {
      for (const db of leftovers) {
        await sql.unsafe(`DROP DATABASE IF EXISTS "${db}"`);
      }
    } else if (action === "select") {
      const toDelete = await multiselect({
        message: "Select databases to delete:",
        options: leftovers.map((db) => ({ value: db, label: db })),
        required: true,
      });
      if (!isCancel(toDelete) && Array.isArray(toDelete) && toDelete.length > 0) {
        for (const db of toDelete) {
          await sql.unsafe(`DROP DATABASE IF EXISTS "${db}"`);
        }
      }
    }
    // action === 'skip' → do nothing
  }

  try {
    // 1. Create temp empty database
    s.start("Creating temp database...");
    await sql.unsafe(`CREATE DATABASE "${tempDb}"`);
    s.stop("Temp database ready.");

    // 2. Backup old migrations
    s.start("Backing up old migrations...");
    const backupDir = `${DRIZZLE_DIR}.${Date.now()}.bak`;
    if (fs.existsSync(DRIZZLE_DIR)) {
      fs.cpSync(DRIZZLE_DIR, backupDir, { recursive: true });
    }
    pruneOldBackups(process.cwd(), 5);
    s.stop(`Backup created: ${path.basename(backupDir)}`);

    // 3. Remove old migrations
    if (fs.existsSync(DRIZZLE_DIR)) {
      for (const file of fs.readdirSync(DRIZZLE_DIR)) {
        if (file.endsWith(".sql")) {
          fs.unlinkSync(path.join(DRIZZLE_DIR, file));
        }
      }
      const metaDir = path.join(DRIZZLE_DIR, "meta");
      if (fs.existsSync(metaDir)) {
        fs.rmSync(metaDir, { recursive: true, force: true });
      }
    }

    // 4. Generate migration against empty database
    s.stop("Running drizzle-kit generate...");
    const tempUrl = `${baseUrl}/${tempDb}`;
    await new Promise<void>((resolve, reject) => {
      const child = spawn("npx", ["drizzle-kit", "generate"], {
        stdio: "inherit",
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: tempUrl },
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`drizzle-kit generate exited with code ${code}`));
        }
      });
    });
    s.start();
    s.stop("Migration generated.");

    // 5. Rename generated file to 0000_squashed_init.sql
    const sqlFiles = fs.readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith(".sql"));
    if (sqlFiles.length === 0) {
      throw new Error("No migration was generated. Schema might be empty.");
    }
    if (sqlFiles.length > 1) {
      throw new Error(
        `Expected 1 generated migration, found ${sqlFiles.length}: ${sqlFiles.join(", ")}`,
      );
    }

    const generatedFile = sqlFiles[0];
    fs.renameSync(
      path.join(DRIZZLE_DIR, generatedFile),
      path.join(DRIZZLE_DIR, "0000_squashed_init.sql"),
    );

    // 6. Update journal
    s.start("Updating journal...");
    const journal = {
      version: "7",
      dialect: "postgresql",
      entries: [
        {
          idx: 0,
          version: "7",
          when: Date.now(),
          tag: "0000_squashed_init",
          breakpoints: true,
        },
      ],
    };
    fs.mkdirSync(path.join(DRIZZLE_DIR, "meta"), { recursive: true });
    fs.writeFileSync(
      path.join(DRIZZLE_DIR, "meta", "_journal.json"),
      JSON.stringify(journal, null, 2),
    );
    s.stop("Journal updated.");

    outro("Migrations squashed to drizzle/0000_squashed_init.sql");
  } catch (e) {
    s.stop("Failed.");
    cancel(String(e));
    process.exit(1);
  } finally {
    try {
      await sql.unsafe(`DROP DATABASE IF EXISTS "${tempDb}"`);
    } catch {
      // ignore cleanup errors
    }
    await sql.end();
  }
}

main().catch((e) => {
  cancel(String(e));
  process.exit(1);
});
