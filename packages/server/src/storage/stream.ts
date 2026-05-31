import type { FastifyReply, FastifyRequest } from "fastify";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
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
  options?: { disposition?: string; request?: FastifyRequest },
): Promise<void> {
  // Get file metadata for caching headers
  const stat = await storage.stat(key);
  const lastModified = stat.lastModified ?? new Date();

  reply
    .header("Content-Type", resolveContentType(key))
    .header("Cache-Control", "public, max-age=3600")
    .header("Last-Modified", lastModified.toUTCString())
    .header("Content-Length", stat.size);
  if (options?.disposition) {
    reply.header("Content-Disposition", options.disposition);
  }

  // Handle conditional request — return 304 if file unchanged
  if (options?.request) {
    const ifModifiedSince = options.request.headers["if-modified-since"];
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      // Compare at second precision (Last-Modified truncates sub-second)
      if (lastModified.getTime() - clientDate.getTime() < 1000) {
        return reply.status(304).send();
      }
    }
  }

  const stream = (await storage.get(key)) as unknown as Readable;

  // Hijack the raw response so we can pipe directly, bypassing
  // Fastify's internal stream handling that triggers write-after-end
  // when the S3 ChecksumStream races with client disconnection.
  reply.hijack();
  try {
    await pipeline(stream, reply.raw);
  } catch (err: any) {
    // Client disconnected or stream ended prematurely — safe to ignore.
    if (
      err?.code === "ERR_STREAM_WRITE_AFTER_END" ||
      err?.code === "ECONNRESET" ||
      err?.code === "ERR_STREAM_PREMATURE_CLOSE"
    ) {
      return;
    }
    throw err;
  }
}
