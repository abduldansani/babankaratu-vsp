import { z } from "zod";

export const createBrandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(100),
});

export const updateBrandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(100),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
