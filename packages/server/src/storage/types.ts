export interface PutOptions {
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
}

export interface ObjectStat {
  size: number;
  contentType: string;
  lastModified?: Date;
}

export interface StorageAdapter {
  put(key: string, data: Buffer | ReadableStream, options?: PutOptions): Promise<void>;
  get(key: string): Promise<ReadableStream>;
  delete(key: string): Promise<void>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  exists(key: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
  stat(key: string): Promise<ObjectStat>;
  copy(sourceKey: string, destKey: string): Promise<void>;
  deleteBucket(): Promise<void>;
}
