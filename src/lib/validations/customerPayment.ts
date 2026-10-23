import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const paymentAllocationInputSchema = z.object({
  saleId: z.string().regex(objectIdRegex, "Invalid sale ID"),
  amount: z.coerce.number().min(0.01, "Allocation amount must be greater than zero"),
});

export const recordCustomerPaymentSchema = z.object({
  customerId: z
    .string()
    .regex(objectIdRegex, "Valid customer is required")
    .optional()
    .or(z.literal("")),
  saleId: z
    .string()
    .regex(objectIdRegex, "Invalid sale ID")
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
  allocations: z.array(paymentAllocationInputSchema).optional().default([]),
});

export const reverseCustomerPaymentSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type PaymentAllocationInput = z.infer<typeof paymentAllocationInputSchema>;
export type RecordCustomerPaymentInput = z.input<typeof recordCustomerPaymentSchema>;
export type ReverseCustomerPaymentInput = z.infer<typeof reverseCustomerPaymentSchema>;

