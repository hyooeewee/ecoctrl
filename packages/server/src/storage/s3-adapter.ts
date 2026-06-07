import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import type { StorageAdapter, PutOptions, ObjectStat } from "./types";

export interface S3AdapterConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle?: boolean;
}

export class S3Adapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;
  private region: string;
  private forcePathStyle: boolean;

  constructor(config: S3AdapterConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? false,
    });
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
    this.region = config.region;
    this.forcePathStyle = config.forcePathStyle ?? false;
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (err: any) {
      if (err.name !== "BucketAlreadyExists" && err.name !== "BucketAlreadyOwnedByYou") {
        throw err;
      }
    }
  }

  async put(key: string, data: Buffer | ReadableStream, options?: PutOptions): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: options?.contentType,
      ContentLength: options?.contentLength,
      Metadata: options?.metadata,
    });
    await this.client.send(command);
  }

  async get(key: string): Promise<ReadableStream> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }
    return response.Body as ReadableStream;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  async getUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client as any, command as any, { expiresIn });
  }

  async getPublicUrl(key: string): Promise<string> {
    const publicEndpoint = env.S3_PUBLIC_ENDPOINT ?? this.endpoint;
    if (this.forcePathStyle) {
      return `${publicEndpoint}/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of response.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }

  async stat(key: string): Promise<ObjectStat> {
    const response = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? "application/octet-stream",
      lastModified: response.LastModified,
    };
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `/${this.bucket}/${encodeURIComponent(sourceKey)}`,
      Key: destKey,
    });
    await this.client.send(command);
  }

  async deleteBucket(): Promise<void> {
    await this.client.send(new DeleteBucketCommand({ Bucket: this.bucket }));
  }
}
