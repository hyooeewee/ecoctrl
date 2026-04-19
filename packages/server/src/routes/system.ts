import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getBackupSchedule, setBackupSchedule } from "@/repositories/backupSchedule";

const scheduleSchema = z.object({
  nextBackup: z.string(),
});

export default async function systemRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/backup-schedule",
    {
      schema: {
        summary: "Get backup schedule",
        response: { 200: scheduleSchema },
      },
    },
    async (_request, reply) => {
      const schedule = await getBackupSchedule();
      return reply.send(schedule ?? { nextBackup: "" });
    },
  );

  fastify.put(
    "/backup-schedule",
    {
      schema: {
        summary: "Update backup schedule",
        body: z.object({ nextBackup: z.string() }),
        response: { 200: scheduleSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as { nextBackup: string };
      await setBackupSchedule(body.nextBackup);
      return reply.send(body);
    },
  );
}
