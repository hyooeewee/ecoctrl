import { env } from "@/lib/env";
import { S3Adapter } from "./s3-adapter";
import { LocalAdapter } from "./local-adapter";
import type { StorageAdapter } from "./types";

let _storage: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!_storage) {
    _storage = createStorageAdapter();
  }
  return _storage;
}

export function createStorageAdapter(): StorageAdapter {
  const provider = env.STORAGE_PROVIDER;

  if (provider === "minio") {
    return new S3Adapter({
      endpoint: env.S3_ENDPOINT!,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY!,
      secretAccessKey: env.S3_SECRET_KEY!,
      bucket: env.S3_BUCKET_FILES,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }

  if (provider === "local") {
    return new LocalAdapter({
      baseDir: "./uploads",
    });
  }

  throw new Error(`Unknown storage provider: ${provider}`);
}

export * from "./types";
