import type { FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createReadStream } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import unzipper from "unzipper";
import { UPLOAD_DIR as BASE_UPLOAD_DIR } from "@/lib/paths";
import { getModels, getModelById, addModel, deleteModel } from "@/repositories/models";

// Temporary directory for immediate stream consumption during multipart parsing
const TMP_DIR = path.join(BASE_UPLOAD_DIR, ".tmp");

const UPLOAD_DIR = path.join(BASE_UPLOAD_DIR, "models");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const FORMAT_MAP: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  zip: "ZIP",
};

const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  format: z.string(),
  size: z.string(),
  fileUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  docUrl: z.string().nullable(),
});

export default async function modelRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get 3D models",
        response: { 200: z.array(modelSchema) },
      },
    },
    async (_request, reply) => {
      const items = await getModels();
      return reply.send(items);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        summary: "Upload a 3D model",
        response: {
          201: modelSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR, { recursive: true });
      }
      ensureUploadDir();

      const parts = request.parts();
      let fileInfo: { filename: string; tempPath: string } | undefined;
      let name = "";
      let version = "";

      for await (const part of parts) {
        if (part.type === "file") {
          // Immediately consume stream to avoid order-dependent issues
          const tempPath = path.join(TMP_DIR, `upload-${crypto.randomUUID()}`);
          await pipeline(part.file, fs.createWriteStream(tempPath));
          fileInfo = { filename: part.filename, tempPath };
        } else {
          if (part.fieldname === "name") name = part.value as string;
          if (part.fieldname === "version") version = part.value as string;
        }
      }

      if (!fileInfo) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const finalName = name || fileInfo.filename.replace(/\.[^/.]+$/, "");
      const finalVersion = version || "v1.0";

      const ext = path.extname(fileInfo.filename).toLowerCase();
      const modelId = crypto.randomUUID();
      let fileUrl: string;
      let format: string;
      let sizeBytes: number;

      if (ext === ".zip") {
        const modelDir = path.join(UPLOAD_DIR, modelId);
        await mkdir(modelDir, { recursive: true });
        const tempZip = path.join(modelDir, "temp.zip");
        fs.renameSync(fileInfo.tempPath, tempZip);

        const zipStats = fs.statSync(tempZip);
        sizeBytes = zipStats.size;

        await createReadStream(tempZip)
          .pipe(unzipper.Extract({ path: modelDir }))
          .promise();
        await rm(tempZip);

        const allFiles = await readdir(modelDir, { recursive: true });
        const gltfFile = allFiles.find((f) => f.toLowerCase().endsWith(".gltf"));
        if (!gltfFile) {
          await rm(modelDir, { recursive: true });
          return reply.status(400).send({ error: "ZIP must contain a .gltf file" });
        }

        fileUrl = `/uploads/models/${modelId}/${gltfFile}`;
        format = "GLTF";
      } else {
        const filename = `${modelId}${ext}`;
        const dest = path.join(UPLOAD_DIR, filename);
        fs.renameSync(fileInfo.tempPath, dest);

        const stats = fs.statSync(dest);
        sizeBytes = stats.size;
        fileUrl = `/uploads/models/${filename}`;
        format = FORMAT_MAP[ext.slice(1)] || ext.slice(1).toUpperCase();
      }

      const id = await addModel({
        name: finalName,
        version: finalVersion,
        format,
        size: formatFileSize(sizeBytes),
        fileUrl,
        thumbnailUrl: null,
        docUrl: null,
      });

      const created = await getModelById(id);
      return reply.status(201).send(created!);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        summary: "Delete a 3D model",
        params: z.object({ id: z.string().describe("Model ID") }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const model = await getModelById(id);
      if (!model) {
        return reply.status(404).send({ error: "Model not found" });
      }

      // Delete physical file or directory
      if (model.fileUrl) {
        const relativePath = model.fileUrl.replace("/uploads/", "");
        const filePath = path.join(BASE_UPLOAD_DIR, relativePath);
        if (fs.existsSync(filePath)) {
          // If it's inside a modelId directory, remove the whole directory
          const parts = relativePath.split(path.sep);
          if (parts.length >= 2) {
            const modelDir = path.join(UPLOAD_DIR, parts[1]);
            if (fs.existsSync(modelDir)) {
              fs.rmSync(modelDir, { recursive: true, force: true });
            }
          } else {
            fs.unlinkSync(filePath);
          }
        }
      }

      await deleteModel(id);
      return reply.send({ success: true });
    },
  );
}
