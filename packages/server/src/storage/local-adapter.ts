import fs from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, unlink, copyFile } from "node:fs/promises";
import type { StorageAdapter, PutOptions, ObjectStat } from "./types";

export interface LocalAdapterConfig {
  baseDir: string;
}

export class LocalAdapter implements StorageAdapter {
  private baseDir: string;

  constructor(config: LocalAdapterConfig) {
    this.baseDir = config.baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolve(key: string): string {
    const safeKey = key.replace(/\.{2,}/g, "").replace(/^\//, "");
    return path.join(this.baseDir, safeKey);
  }

  async put(key: string, data: Buffer | ReadableStream, options?: PutOptions): Promise<void> {
    const filePath = this.resolve(key);
    await mkdir(path.dirname(filePath), { recursive: true });

    if (data instanceof Buffer) {
      await fs.promises.writeFile(filePath, data);
    } else if (data && typeof (data as ReadableStream).getReader === "function") {
      const reader = (data as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const buffer = Buffer.concat(chunks);
      await fs.promises.writeFile(filePath, buffer);
    }
  }

  async get(key: string): Promise<ReadableStream> {
    const filePath = this.resolve(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return createReadStream(filePath) as unknown as ReadableStream;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  async getUrl(key: string): Promise<string> {
    // Local adapter returns a local path, consumers should handle this differently
    // For dev/testing, we return a local API path
    return `/api/local-storage/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.resolve(key));
  }

  async list(prefix: string): Promise<string[]> {
    const prefixPath = this.resolve(prefix);
    if (!fs.existsSync(prefixPath)) return [];

    const entries = await readdir(prefixPath, { recursive: true });
    return entries.map((e) => `${prefix}/${e}`.replace(/\/+/g, "/"));
  }

  async stat(key: string): Promise<ObjectStat> {
    const filePath = this.resolve(key);
    const s = await stat(filePath);
    return {
      size: s.size,
      contentType: "application/octet-stream",
      lastModified: s.mtime,
    };
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    const src = this.resolve(sourceKey);
    const dest = this.resolve(destKey);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
}
