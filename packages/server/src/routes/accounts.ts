import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { z } from "zod";
import { UserSchema, UserCreateBodySchema } from "@ecoctrl/shared";
import type { User, UserCreateBody } from "@ecoctrl/shared";
import { getUsers, addUser, removeUser } from "@/repositories/users";

const successSchema = z.object({ success: z.boolean() });
const errorResponseSchema = z.object({ error: z.string() });

export default async function accountRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get user list",
        response: { 200: z.array(UserSchema) },
      },
    },
    async (_request, reply) => {
      const users: User[] = await getUsers();
      return reply.send(users);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        summary: "Create a user",
        body: UserCreateBodySchema,
        response: { 201: UserSchema },
      },
    },
    async (request, reply) => {
      const body: UserCreateBody = request.body;
      const newUser: User = {
        id: crypto.randomUUID(),
        username: body.username || null,
        email: body.email,
        role: body.role,
        status: "offline",
        lastLogin: null,
        avatarUrl: null,
      };
      await addUser(newUser);
      return reply.status(201).send(newUser);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        summary: "Delete a user",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: successSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = await removeUser(id);
      if (!ok) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.send({ success: true });
    },
  );
}
