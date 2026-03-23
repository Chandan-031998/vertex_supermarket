import { z } from "zod";

export const categoryCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});
