import type { FastifyReply } from "fastify";
import type { StorageAdapter } from "./types";

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
};

function resolveContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}

export async function streamFile(
  storage: StorageAdapter,
  key: string,
  reply: FastifyReply,
  options?: { disposition?: string },
): Promise<void> {
  const stream = await storage.get(key);
  reply
    .header("Content-Type", resolveContentType(key))
    .header("Cache-Control", "public, max-age=3600");
  if (options?.disposition) {
    reply.header("Content-Disposition", options.disposition);
  }
  reply.send(stream);
}
