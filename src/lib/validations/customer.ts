import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export const updateCustomerSchema = createCustomerSchema.extend({
  isActive: z.boolean().optional(),
});

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;

