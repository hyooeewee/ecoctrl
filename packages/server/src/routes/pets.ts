import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import AdmZip from "adm-zip";
import { getPetStorage } from "@/storage";
import { errors } from "@/lib/schemas";

const petJsonSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/i, "id must be alphanumeric with hyphens/underscores"),
  displayName: z.string().min(1),
  description: z.string().optional(),
  spritesheetPath: z.string().optional(),
  kind: z.string().optional(),
});

const petResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  spritesheetUrl: z.string(),
  kind: z.string().optional(),
});

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const chunks: Buffer[] = [];
  if (typeof (stream as any).getReader === "function") {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function normalizeKey(key: string): string {
  return key.startsWith("/") ? key.slice(1) : key;
}

async function listPets(
  storage: ReturnType<typeof getPetStorage>,
): Promise<z.infer<typeof petResponseSchema>[]> {
  const keys = await storage.list("");
  const petJsonKeys = keys.map(normalizeKey).filter((k) => k.endsWith("/pet.json"));
  const results: z.infer<typeof petResponseSchema>[] = [];

  for (const key of petJsonKeys) {
    try {
      const stream = await storage.get(key);
      const raw = await streamToString(stream as ReadableStream<Uint8Array>);
      const parsed = JSON.parse(raw);
      const validated = petJsonSchema.parse(parsed);

      const petId = validated.id;
      const spritesheetKey = `${petId}/spritesheet.webp`;
      const hasSpritesheet = await storage.exists(spritesheetKey);
      if (!hasSpritesheet) continue;

      const spritesheetUrl = `/api/pets/${petId}/spritesheet`;
      results.push({
        id: petId,
        displayName: validated.displayName,
        description: validated.description,
        spritesheetUrl,
        kind: validated.kind,
      });
    } catch {
      // Skip invalid or unreadable pet entries
      continue;
    }
  }

  return results;
}

function isAdmin(user: unknown): boolean {
  const u = user as { id?: number; role?: string } | undefined;
  return u?.role === "super_admin" || u?.role === "admin";
}

export default async function petRoutes(fastify: FastifyInstance) {
  const storage = getPetStorage();

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Pets"],
        summary: "List all pets from storage",
        security: [],
        response: {
          200: z.object({ pets: z.array(petResponseSchema) }),
          ...errors,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const pets = await listPets(storage);
      return reply.send({ pets });
    },
  );

  fastify.get(
    "/:id/spritesheet",
    {
      schema: {
        tags: ["Pets"],
        summary: "Get a pet's spritesheet image",
        security: [],
        params: z.object({ id: z.string() }),
        response: {
          200: z.any().describe("image/webp"),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const key = `${id}/spritesheet.webp`;

      const exists = await storage.exists(key);
      if (!exists) {
        return reply.status(404).send({ error: "Spritesheet not found" });
      }

      const stream = await storage.get(key);
      return reply
        .header("Content-Type", "image/webp")
        .header("Cache-Control", "public, max-age=3600")
        .send(stream);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        tags: ["Pets"],
        summary: "Upload a pet from zip file",
        consumes: ["multipart/form-data"],
        response: {
          201: z.object({ id: z.string(), displayName: z.string() }),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isAdmin(request.user)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const parts = request.parts();
      let fileBuffer: Buffer | undefined;

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          fileBuffer = Buffer.concat(chunks);
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      if (fileBuffer.length > 5 * 1024 * 1024) {
        return reply.status(400).send({ error: "File too large (max 5MB)" });
      }

      let zip: AdmZip;
      try {
        zip = new AdmZip(fileBuffer);
      } catch {
        return reply.status(400).send({ error: "Invalid zip file" });
      }

      const entries = zip.getEntries();
      const petJsonEntry = entries.find((e) => e.entryName === "pet.json");
      const spritesheetEntry = entries.find((e) => e.entryName === "spritesheet.webp");

      if (!petJsonEntry) {
        return reply.status(400).send({ error: "Missing pet.json in zip" });
      }
      if (!spritesheetEntry) {
        return reply.status(400).send({ error: "Missing spritesheet.webp in zip" });
      }

      let petMeta: z.infer<typeof petJsonSchema>;
      try {
        const petJsonRaw = zip.readAsText(petJsonEntry);
        const parsed = JSON.parse(petJsonRaw);
        petMeta = petJsonSchema.parse(parsed);
      } catch (err) {
        return reply.status(400).send({ error: `Invalid pet.json: ${(err as Error).message}` });
      }

      // Check if pet already exists
      const existingPetJson = await storage.exists(`${petMeta.id}/pet.json`);
      if (existingPetJson) {
        return reply.status(409).send({ error: `Pet "${petMeta.id}" already exists` });
      }

      // Upload files
      const petJsonBuffer = zip.readFile(petJsonEntry);
      const spritesheetBuffer = zip.readFile(spritesheetEntry);

      if (!petJsonBuffer || !spritesheetBuffer) {
        return reply.status(400).send({ error: "Failed to read zip entries" });
      }

      await storage.put(`${petMeta.id}/pet.json`, petJsonBuffer, {
        contentType: "application/json",
        contentLength: petJsonBuffer.length,
      });
      await storage.put(`${petMeta.id}/spritesheet.webp`, spritesheetBuffer, {
        contentType: "image/webp",
        contentLength: spritesheetBuffer.length,
      });

      return reply.status(201).send({
        id: petMeta.id,
        displayName: petMeta.displayName,
      });
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Pets"],
        summary: "Delete a pet",
        params: z.object({ id: z.string() }),
        response: {
          204: z.object({}),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isAdmin(request.user)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const { id } = request.params as { id: string };

      const prefix = `${id}/`;
      const keys = await storage.list(prefix);
      if (keys.length === 0) {
        return reply.status(404).send({ error: "Pet not found" });
      }

      for (const key of keys) {
        await storage.delete(normalizeKey(key));
      }

      return reply.status(204).send();
    },
  );

  fastify.post(
    "/reload",
    {
      schema: {
        tags: ["Pets"],
        summary: "Reload pets from storage",
        response: {
          200: z.object({ message: z.string(), pets: z.array(petResponseSchema) }),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isAdmin(request.user)) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const pets = await listPets(storage);
      return reply.send({
        message: "Pets reloaded",
        pets,
      });
    },
  );
}
