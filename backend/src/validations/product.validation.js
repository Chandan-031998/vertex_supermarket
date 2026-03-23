import { z } from "zod";

export const productCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    sku: z.string().min(2),
    barcode: z.string().optional(),
    categoryId: z.number(),
    unit: z.string().default("pcs"),
    mrp: z.number().nonnegative(),
    sellingPrice: z.number().nonnegative(),
    purchasePrice: z.number().nonnegative(),
    gstRate: z.number().nonnegative().default(0),
    reorderLevel: z.number().int().nonnegative().default(0)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});
