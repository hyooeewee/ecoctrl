#!/usr/bin/env node
/**
 * Auto-generates subpath exports in package.json for all UI components.
 *
 * Scans:
 *   - src/components/ui/*.tsx
 *   - src/components/community/*.tsx
 *   - src/components/*.tsx (e.g. theme-provider)
 *   - src/lib/*.ts (e.g. utils)
 *
 * Writes explicit mappings into package.json exports field.
 * Keeps src/ root clean — no proxy files needed.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";

const PKG = new URL("../package.json", import.meta.url).pathname;
const SRC = new URL("../src/", import.meta.url).pathname;

function scanDir(dir, extFilter = [".tsx", ".ts"]) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isFile()) continue;
      const ext = extname(entry);
      if (!extFilter.includes(ext)) continue;
      const name = basename(entry, ext);
      if (name === "index") continue;
      results.push({ name, full, ext });
    }
  } catch {
    // directory may not exist
  }
  return results;
}

const subpaths = new Map();

function addSubpath(name, sourcePath) {
  // skip duplicates — first one wins
  if (subpaths.has(name)) return;
  subpaths.set(name, sourcePath);
}

// src/components/ui/*.tsx -> "./field": "./src/components/ui/field.tsx"
for (const { name } of scanDir(join(SRC, "components/ui"))) {
  addSubpath(name, `./src/components/ui/${name}.tsx`);
}

// src/components/community/*.tsx
for (const { name } of scanDir(join(SRC, "components/community"))) {
  addSubpath(name, `./src/components/community/${name}.tsx`);
}

// src/components/*.tsx (top-level like theme-provider)
for (const { name } of scanDir(join(SRC, "components"))) {
  addSubpath(name, `./src/components/${name}.tsx`);
}

// src/lib/*.ts
for (const { name } of scanDir(join(SRC, "lib"))) {
  addSubpath(name, `./src/lib/${name}.ts`);
}

// sort alphabetically for stable output
const sorted = [...subpaths.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));

const pkg = JSON.parse(readFileSync(PKG, "utf-8"));

// build exports object
const exportsObj = {
  ".": {
    types: "./src/index.ts",
    import: "./src/index.ts",
  },
};

for (const [name, path] of sorted) {
  exportsObj[`./${name}`] = {
    types: path,
    import: path,
  };
}

// preserve existing non-subpath exports
const preserved = {};
for (const [key, val] of Object.entries(pkg.exports || {})) {
  if (key === "." || key.startsWith("./")) {
    // check if it's a known static export (css, package.json, etc.)
    if (key === "./index.css" || key === "./package.json" || typeof val === "string") {
      preserved[key] = val;
    }
    // subpath entries will be overwritten
  }
}

Object.assign(exportsObj, preserved);

pkg.exports = exportsObj;

writeFileSync(PKG, JSON.stringify(pkg, null, 2) + "\n");

console.log(`Updated package.json with ${sorted.length} subpath export(s).`);
for (const [name] of sorted) {
  console.log(`  ./${name}`);
}
