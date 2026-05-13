import { z } from "zod";

// Common error response schemas for route declarations.
// Import and spread into route response objects as needed:
//
//   import { errors } from "@/lib/schemas";
//   response: { 200: ..., ...errors },
//
export const errorResponseSchema = z.object({ error: z.string() });

export const errors = {
  400: errorResponseSchema,
  401: errorResponseSchema,
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  500: errorResponseSchema,
} as const;
