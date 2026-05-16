#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";
import { createWriteStream } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LOG_DIR = join(ROOT, "logs");
mkdirSync(LOG_DIR, { recursive: true });

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_API_PREFIX = "/api";
const DEFAULT_STATIC_PREFIX = "/static";

const ADMIN_PORT = process.env.ADMIN_PORT || "4173";
const WEB_PORT = process.env.WEB_PORT || "8081";
const PM2_APP = "ecoctrl-server";
const PM2_CONFIG = "ecoctrl.config.cjs";

const IS_WIN = platform() === "win32";

// ------------------------------------------------------------------
// Env loading (replaces bash "source" for cross-platform use)
// ------------------------------------------------------------------
function loadEnv(...files) {
  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // Later files override earlier ones, matching bash source behaviour
      process.env[key] = value;
    }
  }
}

// ------------------------------------------------------------------
// PID helpers
// ------------------------------------------------------------------
function pidFile(name) {
  return join(LOG_DIR, `${name}.pid`);
}

function readPid(name) {
  const file = pidFile(name);
  if (!existsSync(file)) return null;
  try {
    return parseInt(readFileSync(file, "utf-8").trim(), 10);
  } catch {
    return null;
  }
}

function writePid(name, pid) {
  writeFileSync(pidFile(name), String(pid));
}

function removePid(name) {
  try {
    unlinkSync(pidFile(name));
  } catch {}
}

function isAlive(name) {
  const pid = readPid(name);
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// PM2 helper
// ------------------------------------------------------------------
function isPm2Online() {
  try {
    const output = execSync("npx --yes pm2 jlist", {
      encoding: "utf-8",
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.includes(`"name":"${PM2_APP}"`);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// lws (local-web-server) helper
// ------------------------------------------------------------------
function startLws(dir, port, logFile, name) {
  const dirPath = resolve(ROOT, dir);
  if (!existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    process.exit(1);
  }

  const apiBaseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
  const apiPrefix = process.env.API_PREFIX || DEFAULT_API_PREFIX;
  const staticPrefix = process.env.STATIC_PREFIX || DEFAULT_STATIC_PREFIX;

  const args = [
    "--yes",
    "local-web-server",
    "--port",
    String(port),
    "--directory",
    dirPath,
    "--spa",
    "index.html",
    "--rewrite",
    `/api/(.*) -> ${apiBaseUrl}${apiPrefix}/$1`,
    "--rewrite",
    `/static/(.*) -> ${apiBaseUrl}${staticPrefix}/$1`,
  ];

  const logPath = join(LOG_DIR, logFile);

  const child = spawn("npx", args, {
    detached: !IS_WIN,
    shell: IS_WIN,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const logStream = createWriteStream(logPath, { flags: "a" });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);

  child.on("error", (err) => {
    console.error(`[${name}] Failed to start:`, err.message);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] Exited with code ${code}`);
    }
    removePid(name);
    logStream.end();
  });

  writePid(name, child.pid);
  return child;
}

// ------------------------------------------------------------------
// Start / stop functions
// ------------------------------------------------------------------
function startAdmin() {
  loadEnv(join(ROOT, ".env.local"), join(ROOT, "admin", ".env.local"));
  const apiBaseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
  const apiPrefix = process.env.API_PREFIX || DEFAULT_API_PREFIX;
  const staticPrefix = process.env.STATIC_PREFIX || DEFAULT_STATIC_PREFIX;
  console.log(
    `Starting admin on :${ADMIN_PORT} (proxy ${apiPrefix} ${staticPrefix} -> ${apiBaseUrl}) ...`,
  );
  startLws("admin", ADMIN_PORT, "admin.log", "admin");
}

function startWeb() {
  loadEnv(join(ROOT, ".env.local"), join(ROOT, "web", ".env.local"));
  const apiBaseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
  const apiPrefix = process.env.API_PREFIX || DEFAULT_API_PREFIX;
  const staticPrefix = process.env.STATIC_PREFIX || DEFAULT_STATIC_PREFIX;
  console.log(
    `Starting web on :${WEB_PORT} (proxy ${apiPrefix} ${staticPrefix} -> ${apiBaseUrl}) ...`,
  );
  startLws("web", WEB_PORT, "web.log", "web");
}

function startServer() {
  const serverDir = resolve(ROOT, "server");
  if (!existsSync(serverDir)) {
    console.error(`Server directory not found: ${serverDir}`);
    process.exit(1);
  }

  console.log("Installing server dependencies ...");
  execSync("npm install --omit=dev", { cwd: serverDir, stdio: "inherit" });

  console.log(`Starting server via pm2 (${PM2_CONFIG}) ...`);
  execSync(`npx --yes pm2 startOrRestart ${PM2_CONFIG}`, {
    cwd: serverDir,
    stdio: "inherit",
  });
}

function startAll() {
  startAdmin();
  startWeb();
  startServer();
  console.log("----------------------------------------");
  console.log(`admin : http://localhost:${ADMIN_PORT}   (log: ${join(LOG_DIR, "admin.log")})`);
  console.log(`web   : http://localhost:${WEB_PORT}     (log: ${join(LOG_DIR, "web.log")})`);
  console.log("server: npx pm2 status");
}

function stopAdmin() {
  if (isAlive("admin")) {
    const pid = readPid("admin");
    console.log(`Stopping admin (pid ${pid}) ...`);
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
  removePid("admin");
}

function stopWeb() {
  if (isAlive("web")) {
    const pid = readPid("web");
    console.log(`Stopping web (pid ${pid}) ...`);
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
  removePid("web");
}

function stopServer() {
  if (isPm2Online()) {
    console.log(`Stopping server (pm2 delete ${PM2_APP}) ...`);
    try {
      execSync(`npx --yes pm2 delete ${PM2_APP}`, {
        cwd: ROOT,
        stdio: "inherit",
      });
    } catch {}
  }
}

function stopAll() {
  stopAdmin();
  stopWeb();
  stopServer();
}

// ------------------------------------------------------------------
// Interactive prompt
// ------------------------------------------------------------------
async function prompt(question) {
  process.stdout.write(question);
  return new Promise((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  const running = [];
  if (isAlive("admin")) running.push("admin");
  if (isAlive("web")) running.push("web");
  if (isPm2Online()) running.push("server");

  if (running.length === 0) {
    startAll();
    return;
  }

  console.log(`Already running: ${running.join(" ")}`);
  console.log("  [r] restart");
  console.log("  [s] stop");
  console.log("  [q] cancel  (default)");

  const choice = await prompt("Choose [r/s/q]: ");

  switch (choice || "q") {
    case "r":
      stopAll();
      console.log("");
      startAll();
      break;
    case "s":
      stopAll();
      break;
    case "q":
      console.log("Canceled.");
      break;
    default:
      console.log(`Unknown choice: ${choice}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
