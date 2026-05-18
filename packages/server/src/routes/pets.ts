import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import AdmZip from "adm-zip";
import { getFileStorage } from "@/storage";
import { errors } from "@/lib/schemas";

const BUILTIN_PETS = [
  {
    id: "usagi",
    displayName: "Usagi",
    description: "A round cream bunny Codex pet with long upright ears, blush cheeks, tiny paws, and a cute catlike mouth.",
    spritesheetUrl: "/assets/pets/usagi/spritesheet.webp",
    kind: "creature",
    source: "built-in" as const,
  },
];

const BUILTIN_IDS = new Set(BUILTIN_PETS.map((p) => p.id));

const petJsonSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/i, "id must be alphanumeric with hyphens/underscores"),
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
  source: z.enum(["built-in", "remote"]),
});

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(result);
}

async function listRemotePets(storage: ReturnType<typeof getFileStorage>): Promise<z.infer<typeof petResponseSchema>[]> {
  const keys = await storage.list("pets/");
  const petJsonKeys = keys.filter((k) => k.endsWith("/pet.json"));
  const results: z.infer<typeof petResponseSchema>[] = [];

  for (const key of petJsonKeys) {
    try {
      const stream = await storage.get(key);
      const raw = await streamToString(stream as ReadableStream<Uint8Array>);
      const parsed = JSON.parse(raw);
      const validated = petJsonSchema.parse(parsed);

      const petId = validated.id;
      if (BUILTIN_IDS.has(petId)) continue;

      const spritesheetKey = `pets/${petId}/spritesheet.webp`;
      const hasSpritesheet = await storage.exists(spritesheetKey);
      if (!hasSpritesheet) continue;

      const spritesheetUrl = await storage.getUrl(spritesheetKey);
      results.push({
        id: petId,
        displayName: validated.displayName,
        description: validated.description,
        spritesheetUrl,
        kind: validated.kind,
        source: "remote",
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
  const storage = getFileStorage();

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Pets"],
        summary: "List all pets (built-in + remote)",
        security: [],
        response: {
          200: z.object({ pets: z.array(petResponseSchema) }),
          ...errors,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const remotePets = await listRemotePets(storage);
      return reply.send({ pets: [...BUILTIN_PETS, ...remotePets] });
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

      if (BUILTIN_IDS.has(petMeta.id)) {
        return reply.status(409).send({ error: `Pet id "${petMeta.id}" conflicts with built-in pet` });
      }

      // Check if remote pet already exists
      const existingPetJson = await storage.exists(`pets/${petMeta.id}/pet.json`);
      if (existingPetJson) {
        return reply.status(409).send({ error: `Pet "${petMeta.id}" already exists` });
      }

      // Upload files
      const petJsonBuffer = zip.readFile(petJsonEntry);
      const spritesheetBuffer = zip.readFile(spritesheetEntry);

      if (!petJsonBuffer || !spritesheetBuffer) {
        return reply.status(400).send({ error: "Failed to read zip entries" });
      }

      await storage.put(`pets/${petMeta.id}/pet.json`, petJsonBuffer, {
        contentType: "application/json",
        contentLength: petJsonBuffer.length,
      });
      await storage.put(`pets/${petMeta.id}/spritesheet.webp`, spritesheetBuffer, {
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
        summary: "Delete a remote pet",
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

      if (BUILTIN_IDS.has(id)) {
        return reply.status(403).send({ error: "Cannot delete built-in pets" });
      }

      const prefix = `pets/${id}/`;
      const keys = await storage.list(prefix);
      if (keys.length === 0) {
        return reply.status(404).send({ error: "Pet not found" });
      }

      for (const key of keys) {
        await storage.delete(key);
      }

      return reply.status(204).send();
    },
  );

  fastify.post(
    "/reload",
    {
      schema: {
        tags: ["Pets"],
        summary: "Reload remote pets from storage",
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

      const remotePets = await listRemotePets(storage);
      return reply.send({
        message: "Pets reloaded",
        pets: [...BUILTIN_PETS, ...remotePets],
      });
    },
  );
}
