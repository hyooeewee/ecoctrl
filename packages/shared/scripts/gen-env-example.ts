import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cancel, confirm, intro, isCancel, outro, spinner } from "@clack/prompts";

/**
 * Annotations recognized in .env.local line endings:
 *   # @public[: VAL]   → keep value (or replace with VAL); preserve comment
 *   # @secret          → clear the value; preserve comment (same as no annotation)
 *   no annotation      → clear the value; preserve comment (safe default)
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

function processLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return line;

  const eq = line.indexOf("=");
  if (eq === -1) return line;

  const key = line.slice(0, eq);
  const raw = line.slice(eq + 1);

  const hashIdx = raw.indexOf("#");
  const valuePart = hashIdx >= 0 ? raw.slice(0, hashIdx).trimEnd() : raw.trimEnd();
  const commentPart = hashIdx >= 0 ? raw.slice(hashIdx) : "";

  // @public: VAL → replace with VAL; @public → keep original value
  const pubMatch = raw.match(ANNOTATION_PUBLIC);
  if (pubMatch) {
    const newValue = pubMatch[1] ? pubMatch[1].trim() : valuePart;
    const remainingComment = commentPart.replace(ANNOTATION_PUBLIC, "").trim();
    if (remainingComment && remainingComment !== "#") {
      return `${key}=${newValue} ${remainingComment}`;
    }
    return `${key}=${newValue}`;
  }

  // Default (including @secret): clear value, strip annotation from comment
  const remainingComment = commentPart.replace(ANNOTATION_SECRET, "").trim();
  if (remainingComment && remainingComment !== "#") {
    return `${key}= ${remainingComment}`;
  }
  return `${key}=`;
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

  const result = content.split("\n").map(processLine).join("\n");
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
