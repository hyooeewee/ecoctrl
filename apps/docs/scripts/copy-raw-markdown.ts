// ========================================
// Copy Raw Markdown
// ========================================
// Copies all source .md files to vitepress build output so they can be
// served at their original paths (e.g., /guide/foo.md) in production.
//
// Runs after `vitepress build` — called from the `build` npm script.

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const docsRoot = join(__dirname, "..");
const outDir = join(docsRoot, ".vitepress", "dist");

// Directories to scan for .md files (relative to docsRoot)
const sourceDirs = [".", "guide", "reference", "deployment"];

/** Recursively find all files matching an extension under a directory. */
function collectFiles(dir: string, extension: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
      results.push(...collectFiles(fullPath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Collect all .md files from the source directories
const mdFiles: string[] = [];
for (const dir of sourceDirs) {
  const absDir = join(docsRoot, dir);
  if (existsSync(absDir)) {
    const files = collectFiles(absDir, ".md");
    // Filter out files inside .vitepress
    const filtered = files.filter((f) => !f.includes(`${join("", ".vitepress")}`));
    mdFiles.push(...filtered);
  }
}

// Copy each .md file preserving its relative path
let copied = 0;
for (const file of mdFiles) {
  const relPath = relative(docsRoot, file);
  const dest = join(outDir, relPath);
  const destDir = dirname(dest);

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  copyFileSync(file, dest);
  copied++;
}

console.log(`\n  Copied ${copied} .md file(s) to ${relative(docsRoot, outDir)}/`);
