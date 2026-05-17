import { createHash } from "crypto";
import { z } from "zod";
import type { PluginManifest } from "./plugin-types";

const manifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.enum(["trigger", "action", "condition"]),
  description: z.string().optional(),
  entry: z.string().default("backend.js"),
  schema: z.string().default("schema.json"),
  icon: z.string().optional(),
  author: z.string().optional(),
  minEngineVersion: z.string().optional(),
});

export function computeContentHash(files: Map<string, string>): string {
  const sorted = Array.from(files.entries()).sort(([a], [b]) => a.localeCompare(b));
  const hash = createHash("sha256");
  for (const [name, content] of sorted) {
    hash.update(name);
    hash.update(content);
  }
  return hash.digest("hex");
}

export async function validatePluginPackage(
  files: Map<string, string>,
): Promise<{ manifest: PluginManifest; backendCode: string; schema: Record<string, unknown>; iconSvg?: string }> {
  // Check required files
  const manifestRaw = files.get("manifest.json");
  if (!manifestRaw) {
    throw new Error("manifest.json is required");
  }
  let manifest: PluginManifest;
  try {
    manifest = manifestSchema.parse(JSON.parse(manifestRaw));
  } catch (err) {
    throw new Error(`Invalid manifest.json: ${(err as Error).message}`);
  }

  const backendCode = files.get(manifest.entry);
  if (!backendCode) {
    throw new Error(`Entry file '${manifest.entry}' not found`);
  }

  const schemaRaw = files.get(manifest.schema);
  if (!schemaRaw) {
    throw new Error(`Schema file '${manifest.schema}' not found`);
  }
  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(schemaRaw) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON in ${manifest.schema}`);
  }
  if (schema.type !== "object") {
    throw new Error("schema.json top-level type must be 'object'");
  }
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    throw new Error("schema.json properties must not be empty");
  }

  const iconSvg = manifest.icon ? files.get(manifest.icon) : undefined;

  // Syntax check backend.js (compile but do not execute)
  // We use a simple check: does it contain module.exports or export default
  if (!backendCode.includes("module.exports")) {
    throw new Error("backend.js must export a function via module.exports");
  }

  return { manifest, backendCode, schema, iconSvg };
}

export async function extractPluginFromZip(
  zipBuffer: Buffer,
): Promise<{ files: Map<string, string>; comment: string | null }> {
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(zipBuffer);
  const comment = zip.getZipComment() || null;
  const files = new Map<string, string>();
  const entries = zip.getEntries();
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName;
    // Prevent path traversal
    if (name.includes("..") || name.startsWith("/")) {
      throw new Error(`Invalid file path in zip: ${name}`);
    }
    files.set(name, zip.readAsText(entry));
  }
  return { files, comment };
}
