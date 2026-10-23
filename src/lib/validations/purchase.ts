import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const purchaseItemInputSchema = z.object({
  product: z.string().regex(objectIdRegex, "Invalid product ID"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  unitCost: z.coerce
    .number()
    .min(0, "Unit cost cannot be negative"),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().regex(objectIdRegex, "Valid supplier is required"),
  purchaseDate: z.string().or(z.date()).optional(),
  items: z
    .array(purchaseItemInputSchema)
    .min(1, "Purchase must include at least one spare part"),
  transport: z.coerce
    .number()
    .min(0, "Transport cost cannot be negative")
    .default(0),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  status: z.enum(["draft", "posted"]).default("draft"),
  initialPayment: z.coerce
    .number()
    .min(0, "Initial payment cannot be negative")
    .default(0),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "cheque", "pos", "other"])
    .optional()
    .default("cash"),
  paymentReference: z.string().trim().max(100).optional().or(z.literal("")),
});

export const updateDraftPurchaseSchema = z.object({
  supplierId: z.string().regex(objectIdRegex, "Valid supplier is required"),
  purchaseDate: z.string().or(z.date()).optional(),
  items: z
    .array(purchaseItemInputSchema)
    .min(1, "Purchase must include at least one spare part"),
  transport: z.coerce
    .number()
    .min(0, "Transport cost cannot be negative")
    .default(0),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const postPurchaseSchema = z.object({
  initialPayment: z.coerce
    .number()
    .min(0, "Initial payment cannot be negative")
    .default(0),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "cheque", "pos", "other"])
    .default("cash"),
  paymentReference: z.string().trim().max(100).optional().or(z.literal("")),
});

export const cancelPurchaseSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updatePurchaseSchema = z.object({
  supplierId: z.string().regex(objectIdRegex, "Valid supplier is required"),
  purchaseDate: z.string().or(z.date()).optional(),
  items: z
    .array(purchaseItemInputSchema)
    .min(1, "Purchase must include at least one spare part"),
  transport: z.coerce
    .number()
    .min(0, "Transport cost cannot be negative")
    .default(0),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  postImmediately: z.boolean().optional(),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdateDraftPurchaseInput = z.infer<typeof updateDraftPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type PostPurchaseInput = z.infer<typeof postPurchaseSchema>;
export type CancelPurchaseInput = z.infer<typeof cancelPurchaseSchema>;
