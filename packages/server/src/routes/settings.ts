import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getUserSettings, upsertUserSettings } from "@/repositories/userSettings";
import { getOnlineUser } from "@/repositories/users";

const BentoLayoutItemSchema = z.object({
  id: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int(),
  h: z.number().int(),
  hidden: z.boolean().optional(),
});

const DashboardSettingsSchema = z.object({
  language: z.enum(["zh-CN", "en-US"]).optional(),
  reducedMotion: z.boolean().optional(),
  autoRotate: z.boolean().optional(),
  rotateSpeed: z.number().min(0.1).max(2).optional(),
  showLabels: z.boolean().optional(),
  glowIntensity: z.number().min(0).max(1).optional(),
  defaultCameraRadius: z.number().min(8).max(60).optional(),
  defaultRotationY: z.number().min(0).max(360).optional(),
  dataRefreshInterval: z.number().min(5).max(120).optional(),
  navHideDelay: z.number().min(1000).max(15000).optional(),
  editAutoExitDelay: z.union([
    z.literal(0),
    z.literal(15000),
    z.literal(30000),
    z.literal(60000),
    z.literal(120000),
    z.literal(300000),
  ]).optional(),
  bentoLayout: z.array(BentoLayoutItemSchema).optional(),
});

type DashboardSettings = z.infer<typeof DashboardSettingsSchema>;

export default async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get current user dashboard settings",
        response: { 200: z.record(z.string(), z.unknown()) },
      },
    },
    async (_request, reply) => {
      const user = await getOnlineUser();
      if (!user) {
        return reply.send({});
      }
      const settings = await getUserSettings(user.id);
      return reply.send(settings);
    },
  );

  fastify.patch(
    "/",
    {
      schema: {
        summary: "Update current user dashboard settings",
        body: DashboardSettingsSchema,
        response: {
          200: z.object({ ok: z.literal(true) }),
          400: z.object({ ok: z.literal(false), error: z.string() }),
          401: z.object({ ok: z.literal(false), error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await getOnlineUser();
      if (!user) {
        return reply.status(401).send({ ok: false, error: "No authenticated user" });
      }

      const body = request.body as DashboardSettings;
      await upsertUserSettings(user.id, body as Record<string, unknown>);
      return reply.send({ ok: true });
    },
  );
}
