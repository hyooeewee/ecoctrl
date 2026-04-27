#!/usr/bin/env node
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Annotations recognized in .env.local line endings:
 *   # @secret          → clear the value
 *   # @example: VAL    → replace with VAL as the placeholder
 *   no annotation      → keep the original line (value + dotenv comments)
 */
const ANNOTATION_SECRET = /\s+#\s*@secret\b/;
const ANNOTATION_EXAMPLE = /\s+#\s*@example:\s*(.+)/;

function help() {
  console.log(`
Usage: gen-env-example.mjs [options]

Options:
  --src <file>    Source env file (default: .env.local)
  --dest <file>   Destination file (default: .env.example)
  --check         Only validate; exit 1 if dest differs from generated
  -h, --help      Show this message
`);
}

function processLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return line;

  const eq = line.indexOf("=");
  if (eq === -1) return line;

  const key = line.slice(0, eq);
  const raw = line.slice(eq + 1);

  // Security-first: @secret takes precedence
  if (ANNOTATION_SECRET.test(raw)) {
    return `${key}=`;
  }

  const exMatch = raw.match(ANNOTATION_EXAMPLE);
  if (exMatch) {
    return `${key}=${exMatch[1].trim()}`;
  }

  // Default: preserve the entire line (value + standard dotenv comments)
  return line;
}

function main() {
  let src = ".env.local";
  let dest = ".env.example";
  let checkOnly = false;

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--src") src = args[++i];
    else if (a === "--dest") dest = args[++i];
    else if (a === "--check") checkOnly = true;
    else if (a === "-h" || a === "--help") return help();
  }

  const srcPath = resolve(src);

  try {
    statSync(srcPath);
  } catch {
    // No source file — skip silently (e.g. CI without .env.local)
    process.exit(0);
  }

  const content = readFileSync(srcPath, "utf8");
  const result = content.split("\n").map(processLine).join("\n");

  const destPath = resolve(dest);

  if (checkOnly) {
    try {
      const existing = readFileSync(destPath, "utf8");
      if (existing === result) {
        console.log(`OK: ${dest} is up to date.`);
        return;
      }
      console.error(`FAIL: ${dest} is out of date. Run without --check to sync.`);
      process.exit(1);
    } catch {
      console.error(`FAIL: ${dest} does not exist. Run without --check to create.`);
      process.exit(1);
    }
  }

  writeFileSync(destPath, result);
  console.log(`✓ ${src} → ${dest}`);
}

main();
