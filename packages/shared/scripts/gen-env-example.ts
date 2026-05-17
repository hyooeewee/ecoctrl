import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cancel, confirm, intro, isCancel, outro, spinner } from "@clack/prompts";

/**
 * Annotations recognized in .env.local:
 *   # @public[: VAL]   → keep value (or replace with VAL)
 *   # @secret          → clear the value
 *   no annotation      → clear the value (safe default)
 *
 * Supports both leading-comment style (recommended) and legacy inline style.
 */
const ANNOTATION_PUBLIC = /#\s*@public(?::\s*([^#]+))?/;
const ANNOTATION_SECRET = /#\s*@secret\b/;

function help() {
  console.log(`
Usage: gen-env-example.ts [src] [options]

Arguments:
  src             Source env file (default: .env.local)

Options:
  --dest <file>   Destination file (default: <same-dir>/.env.example)
  --check         Only validate; exit 1 if dest differs from generated
  -y              Overwrite existing destination without prompting
  -h, --help      Show this message
`);
}

function processLines(lines: string[]): string[] {
  const result: string[] = [];
  let pendingPublic: { value?: string } | null = null;
  let pendingSecret = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line: reset state
    if (!trimmed) {
      result.push(line);
      pendingPublic = null;
      pendingSecret = false;
      continue;
    }

    // Comment line – check for annotation
    if (trimmed.startsWith("#")) {
      const pubMatch = trimmed.match(ANNOTATION_PUBLIC);
      if (pubMatch) {
        pendingPublic = { value: pubMatch[1] ? pubMatch[1].trim() : undefined };
        pendingSecret = false;
        // Strip annotation; keep any remaining descriptive text
        let remaining = trimmed.replace(ANNOTATION_PUBLIC, "").trim();
        remaining = remaining.replace(/^#\s*#/, "#").trim();
        if (remaining && remaining !== "#") {
          result.push(remaining);
        }
        continue;
      }

      const secMatch = trimmed.match(ANNOTATION_SECRET);
      if (secMatch) {
        pendingSecret = true;
        pendingPublic = null;
        let remaining = trimmed.replace(ANNOTATION_SECRET, "").trim();
        remaining = remaining.replace(/^#\s*#/, "#").trim();
        if (remaining && remaining !== "#") {
          result.push(remaining);
        }
        continue;
      }

      // Regular comment
      result.push(line);
      continue;
    }

    // Variable line
    const eq = line.indexOf("=");
    if (eq === -1) {
      result.push(line);
      pendingPublic = null;
      pendingSecret = false;
      continue;
    }

    const key = line.slice(0, eq).trimEnd();
    const rawValue = line.slice(eq + 1);

    // Backward compat: also scan for inline annotation in the value part
    const hashIdx = rawValue.indexOf("#");
    const valuePart = hashIdx >= 0 ? rawValue.slice(0, hashIdx).trimEnd() : rawValue.trimEnd();
    const commentPart = hashIdx >= 0 ? rawValue.slice(hashIdx) : "";
    const inlinePubMatch = commentPart.match(ANNOTATION_PUBLIC);
    const inlineSecMatch = commentPart.match(ANNOTATION_SECRET);

    if (pendingPublic) {
      const newValue = pendingPublic.value ?? valuePart;
      result.push(`${key}=${newValue}`);
    } else if (pendingSecret) {
      result.push(`${key}=`);
    } else if (inlinePubMatch) {
      const newValue = inlinePubMatch[1] ? inlinePubMatch[1].trim() : valuePart;
      result.push(`${key}=${newValue}`);
    } else if (inlineSecMatch) {
      result.push(`${key}=`);
    } else {
      // No annotation: clear value (safe default)
      result.push(`${key}=`);
    }

    pendingPublic = null;
    pendingSecret = false;
  }

  return result;
}

function findBackupName(destPath: string): string {
  let i = 1;
  while (existsSync(`${destPath}.${i}`)) {
    i++;
  }
  return `${destPath}.${i}`;
}

async function main() {
  let src = ".env.local";
  let dest = "";
  let checkOnly = false;
  let yesFlag = false;

  const args = process.argv.slice(2);
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dest") dest = args[++i];
    else if (a === "--check") checkOnly = true;
    else if (a === "-y") yesFlag = true;
    else if (a === "-h" || a === "--help") return help();
    else if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    } else {
      positional.push(a);
    }
  }

  if (positional[0]) src = positional[0];

  // Default dest: sibling of src named .env.example
  if (!dest) {
    const srcDir = dirname(resolve(src));
    dest = join(srcDir, ".env.example");
  }

  const srcPath = resolve(src);
  const destPath = resolve(dest);

  if (!checkOnly) {
    intro("gen-env-example");
  }

  const s = spinner();
  s.start(`Reading ${src}...`);

  let content: string;
  try {
    statSync(srcPath);
    content = readFileSync(srcPath, "utf8");
  } catch {
    s.stop(`Source file not found: ${src}`);
    if (!checkOnly) {
      cancel("Operation cancelled.");
    }
    process.exit(0);
  }

  const result = processLines(content.split("\n")).join("\n");
  s.stop(`Processed ${src}`);

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

  if (existsSync(destPath)) {
    if (!yesFlag) {
      const shouldOverwrite = await confirm({
        message: `${dest} already exists. Overwrite?`,
        initialValue: true,
      });
      if (isCancel(shouldOverwrite)) {
        cancel("Operation cancelled.");
        process.exit(0);
      }
      if (!shouldOverwrite) {
        const backupPath = findBackupName(destPath);
        s.start(`Backing up to ${backupPath}...`);
        renameSync(destPath, backupPath);
        s.stop(`Backed up to ${backupPath}`);
      }
    }
    // If -y or user confirmed overwrite, proceed directly
  }

  s.start(`Writing ${dest}...`);
  writeFileSync(destPath, result);
  s.stop(`Written ${dest}`);

  outro(`Done: ${src} → ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
