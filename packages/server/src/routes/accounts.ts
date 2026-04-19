import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import type { User } from "@/types/index";
import { getUsers, addUser, removeUser } from "@/db/users";

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    email: { type: "string" },
    role: { type: "string" },
    status: { type: "string", enum: ["active", "inactive"] },
    lastLogin: { type: "string" },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export default async function accountRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        summary: "Get user list",
        response: {
          200: {
            type: "array",
            items: userSchema,
          },
        },
      },
    },
    async (_request, reply) => {
      const users: User[] = getUsers();
      return reply.send(users);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        summary: "Create a user",
        body: {
          type: "object",
          required: ["name", "email", "role"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string" },
          },
        },
        response: {
          201: userSchema,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { name: string; email: string; role: string };
      const newUser: User = {
        id: crypto.randomUUID(),
        name: body.name,
        email: body.email,
        role: body.role,
        status: "active",
        lastLogin: "-",
      };
      addUser(newUser);
      return reply.status(201).send(newUser);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        summary: "Delete a user",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "User ID" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
          },
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = removeUser(id);
      if (!ok) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.send({ success: true });
    },
  );
}
