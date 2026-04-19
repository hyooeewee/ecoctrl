import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development";
const ROOT = path.resolve(__dirname, isDev ? "../.." : "..");

export const DATA_DIR = path.join(ROOT, "data");
export const UPLOAD_DIR = path.join(ROOT, "uploads");
