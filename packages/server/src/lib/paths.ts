import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dev:  __dirname = .../server/src/lib  → go up 2 levels to package root
// prod: __dirname = .../server/dist     → go up 1 level to package root
const isCompiled = __dirname.endsWith("/dist") || __dirname.endsWith("\\dist");
const ROOT = path.resolve(__dirname, isCompiled ? ".." : "../..");

export const DATA_DIR = path.join(ROOT, "data");
export const UPLOAD_DIR = path.join(ROOT, "uploads");
