import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().regex(objectIdRegex, "Valid supplier is required"),
  purchaseId: z
    .string()
    .regex(objectIdRegex, "Invalid purchase ID")
    .optional()
    .or(z.literal("")),
  amount: z.coerce
    .number()
    .min(0.01, "Payment amount must be greater than zero"),
  paymentDate: z.string().or(z.date()).optional(),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "cheque", "pos", "other"])
    .default("cash"),
  reference: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const reverseSupplierPaymentSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RecordSupplierPaymentInput = z.infer<
  typeof recordSupplierPaymentSchema
>;
export type ReverseSupplierPaymentInput = z.infer<
  typeof reverseSupplierPaymentSchema
>;
