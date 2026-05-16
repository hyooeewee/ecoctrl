#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";
import { createWriteStream } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
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

      // Parse value, respecting quotes and stripping inline comments
      let raw = trimmed.slice(eq + 1).trim();
      let value = "";
      let inQuote = false;
      let quoteChar = "";
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (!inQuote && (ch === '"' || ch === "'")) {
          inQuote = true;
          quoteChar = ch;
          value += ch;
        } else if (inQuote && ch === quoteChar) {
          inQuote = false;
          value += ch;
        } else if (!inQuote && ch === "#") {
          // Only treat # as comment start if preceded by whitespace or at value start
          if (value.length === 0 || /\s$/.test(value)) {
            break;
          }
          value += ch;
        } else {
          value += ch;
        }
      }
      value = value.trim();
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
async function waitForExit(name, timeoutMs = 3000) {
  const start = Date.now();
  while (isAlive(name) && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (isAlive(name)) {
    const pid = readPid(name);
    console.log(`[${name}] SIGTERM timeout, forcing SIGKILL (pid ${pid}) ...`);
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
    // Wait briefly for SIGKILL to take effect
    await new Promise((r) => setTimeout(r, 200));
  }
  removePid(name);
}

function resolvePm2Cmd() {
  const serverDir = resolve(ROOT, "server");
  const pm2Bin = join(serverDir, "node_modules", ".bin", "pm2");
  return existsSync(pm2Bin) ? pm2Bin : "npx --yes pm2";
}

function isPm2Online() {
  const pm2Cmd = resolvePm2Cmd();
  const serverDir = resolve(ROOT, "server");
  try {
    const output = execSync(`${pm2Cmd} jlist`, {
      encoding: "utf-8",
      cwd: serverDir,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.includes(`"name":"${PM2_APP}"`) || output.includes(`"name":"ecoctrl-worker"`);
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
  child.stdout.pipe(logStream, { end: false });
  child.stderr.pipe(logStream, { end: false });

  child.on("error", (err) => {
    console.error(`[${name}] Failed to start:`, err.message);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] Exited with code ${code}`);
    }
    removePid(name);
    child.stdout.unpipe(logStream);
    child.stderr.unpipe(logStream);
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

  const nodeModules = join(serverDir, "node_modules");
  if (!existsSync(nodeModules)) {
    console.log("Installing server dependencies ...");
    execSync("npm install --omit=dev", { cwd: serverDir, stdio: "inherit" });
  }

  const pm2Cmd = resolvePm2Cmd();
  console.log(`Starting server via pm2 (${PM2_CONFIG}) ...`);
  execSync(`${pm2Cmd} startOrRestart ${PM2_CONFIG}`, {
    cwd: serverDir,
    stdio: "inherit",
  });
}

function startAll() {
  console.error(
    "\n  ⚠️  DEPRECATION WARNING: Asset deployment is deprecated and will be removed soon.\n" +
      "     Use Docker Compose instead: https://docs.godot.qzz.io\n",
  );
  startAdmin();
  startWeb();
  startServer();
  console.log("----------------------------------------");
  console.log(`admin : http://localhost:${ADMIN_PORT}   (log: ${join(LOG_DIR, "admin.log")})`);
  console.log(`web   : http://localhost:${WEB_PORT}     (log: ${join(LOG_DIR, "web.log")})`);
  console.log("server: npx pm2 status");
}

async function stopAdmin() {
  if (isAlive("admin")) {
    const pid = readPid("admin");
    console.log(`Stopping admin (pid ${pid}) ...`);
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
    await waitForExit("admin");
  } else {
    removePid("admin");
  }
}

async function stopWeb() {
  if (isAlive("web")) {
    const pid = readPid("web");
    console.log(`Stopping web (pid ${pid}) ...`);
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
    await waitForExit("web");
  } else {
    removePid("web");
  }
}

function stopServer() {
  const pm2Cmd = resolvePm2Cmd();
  const serverDir = resolve(ROOT, "server");
  for (const app of [PM2_APP, "ecoctrl-worker"]) {
    try {
      const output = execSync(`${pm2Cmd} jlist`, {
        encoding: "utf-8",
        cwd: serverDir,
        stdio: ["ignore", "pipe", "ignore"],
      });
      if (output.includes(`"name":"${app}"`)) {
        console.log(`Stopping server (pm2 delete ${app}) ...`);
        execSync(`${pm2Cmd} delete ${app}`, { cwd: serverDir, stdio: "inherit" });
      }
    } catch {}
  }
}

async function stopAll() {
  await stopAdmin();
  await stopWeb();
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
    process.exit(0);
  }

  console.log(`Already running: ${running.join(" ")}`);
  console.log("  [r] restart");
  console.log("  [s] stop");
  console.log("  [q] cancel  (default)");

  const choice = await prompt("Choose [r/s/q]: ");

  switch (choice || "q") {
    case "r":
      await stopAll();
      console.log("");
      startAll();
      process.exit(0);
    case "s":
      await stopAll();
      break;
    case "q":
      console.log("Canceled.");
      break;
    default:
      console.log(`Unknown choice: ${choice}`);
      process.exit(1);
  }

  process.stdin.pause();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
