import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyMultipart from "@fastify/multipart";
import type { FastifyRequest, FastifyReply } from "fastify";
import { ReadableStream } from "node:stream/web";
import { validatorCompiler, serializerCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import modelRoutes from "@/routes/models";

// Mock model storage so uploads do not require S3/MinIO in tests.
vi.mock("@/storage", () => {
  const files = new Map<string, Buffer>();

  async function readStream(data: Buffer | ReadableStream): Promise<Buffer> {
    if (data instanceof Buffer) return data;
    const reader = (data as unknown as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  const storage = {
    put: async (key: string, data: Buffer | ReadableStream) => {
      files.set(key, await readStream(data));
    },
    get: async (key: string) => {
      const buffer = files.get(key);
      if (!buffer) throw new Error(`Object not found: ${key}`);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(buffer);
          controller.close();
        },
      });
    },
    delete: async (key: string) => {
      files.delete(key);
    },
    getUrl: async () => "",
    getPublicUrl: async () => "",
    exists: async (key: string) => files.has(key),
    list: async (prefix: string) =>
      Array.from(files.keys()).filter((key) => key.startsWith(prefix)),
    stat: async (key: string) => {
      const buffer = files.get(key);
      if (!buffer) throw new Error(`Object not found: ${key}`);
      return {
        size: buffer.length,
        contentType: "application/octet-stream",
        lastModified: new Date(),
      };
    },
    copy: async (sourceKey: string, destKey: string) => {
      const buffer = files.get(sourceKey);
      if (buffer) files.set(destKey, buffer);
    },
    deleteBucket: async () => {
      files.clear();
    },
  };

  return {
    getModelStorage: () => storage,
  };
});

interface MultipartPayload {
  body: Buffer;
  boundary: string;
}

function buildMultipartBody(
  fields: Record<string, string>,
  file?: { name: string; filename: string; content: Buffer; contentType: string },
): MultipartPayload {
  const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`;
  const chunks: Buffer[] = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }

  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
      ),
    );
    chunks.push(file.content);
    chunks.push(Buffer.from(`\r\n`));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), boundary };
}

describe("POST /models", () => {
  let fastify: ReturnType<typeof Fastify>;
  let accessToken: string;

  beforeAll(async () => {
    fastify = Fastify().withTypeProvider<ZodTypeProvider>();
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
    await fastify.register(fastifyJwt, { secret: "test-secret" });
    await fastify.register(fastifyMultipart, {
      limits: { fileSize: 500 * 1024 * 1024, files: 10 },
    });
    fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    });
    await fastify.register(modelRoutes, { prefix: "/models" });
    accessToken = fastify.jwt.sign({ id: "user-123", username: "test" });
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(async () => {
    // Clear any uploaded files between tests.
    const { getModelStorage } = await import("@/storage");
    await getModelStorage().deleteBucket();
  });

  it("should upload a GLB file without buffering", async () => {
    const content = Buffer.from("fake-glb-content");
    const { body, boundary } = buildMultipartBody(
      { name: "Test Model", version: "v1.0", code: "C" },
      { name: "file", filename: "model.glb", content, contentType: "model/gltf-binary" },
    );

    const res = await fastify.inject({
      method: "POST",
      url: "/models",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    const payload = JSON.parse(res.payload);
    expect(payload.name).toBe("Test Model");
    expect(payload.format).toBe("GLB");
    expect(payload.size).toBe("16B");
    expect(payload.fileUrl).toMatch(/\.(glb)$/);
  });

  it("should reject requests without a file", async () => {
    const { body, boundary } = buildMultipartBody({
      name: "No File",
      version: "v1.0",
      code: "N",
    });

    const res = await fastify.inject({
      method: "POST",
      url: "/models",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe("No file uploaded");
  });
});

describe("PUT /models/:id/file", () => {
  let fastify: ReturnType<typeof Fastify>;
  let accessToken: string;

  beforeAll(async () => {
    fastify = Fastify().withTypeProvider<ZodTypeProvider>();
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
    await fastify.register(fastifyJwt, { secret: "test-secret" });
    await fastify.register(fastifyMultipart, {
      limits: { fileSize: 500 * 1024 * 1024, files: 10 },
    });
    fastify.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    });
    await fastify.register(modelRoutes, { prefix: "/models" });
    accessToken = fastify.jwt.sign({ id: "user-123", username: "test" });
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(async () => {
    const { getModelStorage } = await import("@/storage");
    await getModelStorage().deleteBucket();
  });

  it("should replace a model file", async () => {
    // Seed an existing model record via POST first.
    const original = Buffer.from("original-glb");
    const { body: createBody, boundary: createBoundary } = buildMultipartBody(
      { name: "Original", version: "v1.0", code: "R" },
      { name: "file", filename: "model.glb", content: original, contentType: "model/gltf-binary" },
    );

    const createRes = await fastify.inject({
      method: "POST",
      url: "/models",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${createBoundary}`,
      },
      payload: createBody,
    });

    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload);

    // Replace the file.
    const replacement = Buffer.from("replacement-glb");
    const { body: replaceBody, boundary: replaceBoundary } = buildMultipartBody(
      {},
      {
        name: "file",
        filename: "model.glb",
        content: replacement,
        contentType: "model/gltf-binary",
      },
    );

    const replaceRes = await fastify.inject({
      method: "PUT",
      url: `/models/${created.id}/file`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/form-data; boundary=${replaceBoundary}`,
      },
      payload: replaceBody,
    });

    expect(replaceRes.statusCode).toBe(200);
    const updated = JSON.parse(replaceRes.payload);
    expect(updated.size).toBe("15B");
  });
});
