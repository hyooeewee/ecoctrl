import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { PluginRegistry } from "@/engine/plugin-registry";
import { errors, errorResponseSchema } from "@/lib/schemas";

const nodeDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  category: z.enum(["trigger", "action", "condition"]),
  description: z.string().optional(),
  icon: z.string().optional(),
  schema: z.record(z.string(), z.unknown()),
});

export default async function nodeRoutes(
  fastify: FastifyInstance,
  options: { registry: PluginRegistry },
) {
  const { registry } = options;

  fastify.get(
    "/",
    {
      schema: {
        tags: ["Nodes"],
        summary: "List all plugin nodes (latest version)",
        response: {
          200: z.array(nodeDetailSchema),
          ...errors,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const plugins = registry.getAll();
      return reply.send(
        plugins.map((p) => ({
          id: p.id,
          name: p.manifest.name,
          version: p.version,
          category: p.manifest.category,
          description: p.manifest.description,
          icon: p.iconSvg,
          schema: p.schema,
        })),
      );
    },
  );

  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Nodes"],
        summary: "Get node versions",
        params: z.object({ id: z.string() }),
        response: {
          200: z.object({
            id: z.string(),
            versions: z.array(
              z.object({
                version: z.string(),
                name: z.string(),
                category: z.enum(["trigger", "action", "condition"]),
              }),
            ),
          }),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const versions = registry.getVersions(id);
      if (versions.length === 0) {
        return reply.status(404).send({ error: "Plugin not found" });
      }
      return reply.send({
        id,
        versions: versions.map((v) => ({
          version: v.version,
          name: v.manifest.name,
          category: v.manifest.category,
        })),
      });
    },
  );

  fastify.get(
    "/:id/:version",
    {
      schema: {
        tags: ["Nodes"],
        summary: "Get specific node version detail",
        params: z.object({ id: z.string(), version: z.string() }),
        response: {
          200: nodeDetailSchema,
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, version } = request.params as { id: string; version: string };
      const plugin = registry.get(id, version);
      if (!plugin) {
        return reply.status(404).send({ error: "Plugin version not found" });
      }
      return reply.send({
        id: plugin.id,
        name: plugin.manifest.name,
        version: plugin.version,
        category: plugin.manifest.category,
        description: plugin.manifest.description,
        icon: plugin.iconSvg,
        schema: plugin.schema,
      });
    },
  );

  fastify.get(
    "/:id/:version/download",
    {
      schema: {
        tags: ["Nodes"],
        summary: "Download a plugin as .ecn file",
        params: z.object({ id: z.string(), version: z.string() }),
        response: {
          200: z.any(),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, version } = request.params as { id: string; version: string };
      try {
        const buffer = await registry.exportPlugin(id, version);
        const filename = `${id}-${version}.ecn`;
        return reply
          .header("Content-Type", "application/octet-stream")
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .send(buffer);
      } catch (err) {
        return reply.status(404).send({ error: (err as Error).message });
      }
    },
  );

  fastify.post(
    "/install",
    {
      schema: {
        tags: ["Nodes"],
        summary: "Install a plugin node from .ecn file",
        consumes: ["multipart/form-data"],
        response: {
          201: z.object({
            id: z.string(),
            version: z.string(),
            name: z.string(),
          }),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
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

      try {
        const plugin = await registry.install(fileBuffer);
        return reply.status(201).send({
          id: plugin.id,
          version: plugin.version,
          name: plugin.manifest.name,
        });
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message });
      }
    },
  );

  fastify.delete(
    "/:id/:version",
    {
      schema: {
        tags: ["Nodes"],
        summary: "Uninstall a plugin version",
        params: z.object({ id: z.string(), version: z.string() }),
        response: {
          204: z.object({}),
          ...errors,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id, version } = request.params as { id: string; version: string };
      try {
        await registry.uninstall(id, version);
        return reply.status(204).send();
      } catch (err) {
        return reply.status(400).send({ error: (err as Error).message });
      }
    },
  );

  fastify.post(
    "/reload",
    {
      schema: {
        tags: ["Nodes"],
        summary: "Reload plugin registry from disk",
        response: {
          200: z.object({ message: z.string() }),
          ...errors,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      await registry.reload();
      return reply.send({ message: "Registry reloaded" });
    },
  );
}
