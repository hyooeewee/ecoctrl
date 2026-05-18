import { env } from "@/lib/env";
import { S3Adapter } from "./s3-adapter";
import { LocalAdapter } from "./local-adapter";
import type { StorageAdapter } from "./types";

let _fileStorage: StorageAdapter | null = null;
let _modelStorage: StorageAdapter | null = null;
let _pluginStorage: StorageAdapter | null = null;
let _petStorage: StorageAdapter | null = null;

function createS3Adapter(bucket: string): StorageAdapter {
  return new S3Adapter({
    endpoint: env.S3_ENDPOINT!,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY!,
    secretAccessKey: env.S3_SECRET_KEY!,
    bucket,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
}

export function getFileStorage(): StorageAdapter {
  if (!_fileStorage) {
    const provider = env.STORAGE_PROVIDER;
    if (provider === "minio") {
      _fileStorage = createS3Adapter(env.S3_BUCKET_FILES);
    } else if (provider === "local") {
      _fileStorage = new LocalAdapter({ baseDir: "./uploads" });
    } else {
      throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
  return _fileStorage;
}

export function getModelStorage(): StorageAdapter {
  if (!_modelStorage) {
    const provider = env.STORAGE_PROVIDER;
    if (provider === "minio") {
      _modelStorage = createS3Adapter(env.S3_BUCKET_MODELS);
    } else if (provider === "local") {
      _modelStorage = new LocalAdapter({ baseDir: "./uploads" });
    } else {
      throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
  return _modelStorage;
}

export function getPluginStorage(): StorageAdapter {
  if (!_pluginStorage) {
    const provider = env.STORAGE_PROVIDER;
    if (provider === "minio") {
      _pluginStorage = createS3Adapter(env.S3_BUCKET_PLUGINS);
    } else if (provider === "local") {
      _pluginStorage = new LocalAdapter({ baseDir: "./plugins" });
    } else {
      throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
  return _pluginStorage;
}

export function getPetStorage(): StorageAdapter {
  if (!_petStorage) {
    const provider = env.STORAGE_PROVIDER;
    if (provider === "minio") {
      _petStorage = createS3Adapter(env.S3_BUCKET_PETS);
    } else if (provider === "local") {
      _petStorage = new LocalAdapter({ baseDir: "./pets" });
    } else {
      throw new Error(`Unknown storage provider: ${provider}`);
    }
  }
  return _petStorage;
}

/** @deprecated Use getFileStorage() or getModelStorage() instead. */
export function getStorage(): StorageAdapter {
  return getFileStorage();
}

export function createStorageAdapter(): StorageAdapter {
  return getFileStorage();
}

export async function ensureS3Buckets(): Promise<void> {
  if (env.STORAGE_PROVIDER !== "minio") return;

  const endpoint = env.S3_ENDPOINT!;
  const accessKeyId = env.S3_ACCESS_KEY!;
  const secretAccessKey = env.S3_SECRET_KEY!;
  const region = env.S3_REGION;

  const filesAdapter = new S3Adapter({
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket: env.S3_BUCKET_FILES,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  const modelsAdapter = new S3Adapter({
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket: env.S3_BUCKET_MODELS,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  const pluginsAdapter = new S3Adapter({
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket: env.S3_BUCKET_PLUGINS,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  const petsAdapter = new S3Adapter({
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket: env.S3_BUCKET_PETS,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  await filesAdapter.ensureBucket();
  await modelsAdapter.ensureBucket();
  await pluginsAdapter.ensureBucket();
  await petsAdapter.ensureBucket();
}

export * from "./types";
