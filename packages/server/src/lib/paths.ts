import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { env } from "@/lib/env";

const isDev = env.NODE_ENV === "development";
const ROOT = path.resolve(__dirname, isDev ? "../.." : "..");

export const UPLOAD_DIR = path.join(ROOT, "uploads");
