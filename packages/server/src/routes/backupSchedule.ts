import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BackupScheduleSchema } from "@ecoctrl/shared";
import { getBackupSchedule, setBackupSchedule } from "@/repositories/backupSchedule";

export default async function systemRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/backup-schedule",
    {
      schema: {
        tags: ["System"],
        summary: "Get backup schedule",
        response: { 200: BackupScheduleSchema },
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
        tags: ["System"],
        summary: "Update backup schedule",
        body: z.object({ nextBackup: z.string() }),
        response: { 200: BackupScheduleSchema },
      },
    },
    async (request, reply) => {
      const body = request.body as { nextBackup: string };
      await setBackupSchedule(body.nextBackup);
      return reply.send(body);
    },
  );
}
