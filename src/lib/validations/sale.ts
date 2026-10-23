import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const saleItemInputSchema = z.object({
  product: z.string().regex(objectIdRegex, "Invalid product ID"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce
    .number()
    .min(0, "Unit price cannot be negative"),
});

export const createProductSaleSchema = z.object({
  customerId: z
    .string()
    .regex(objectIdRegex, "Invalid customer ID")
    .optional()
    .or(z.literal("")),
  isWalkIn: z.boolean().default(false),
  customerName: z.string().trim().max(120).optional().or(z.literal("")),
  customerPhone: z.string().trim().max(30).optional().or(z.literal("")),
  items: z
    .array(saleItemInputSchema)
    .min(1, "Sale must include at least one product"),
  discount: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .default(0),
  saleDate: z.string().or(z.date()).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  initialPayment: z.coerce
    .number()
    .min(0, "Initial payment cannot be negative")
    .default(0),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "cheque", "pos", "other"])
    .optional()
    .default("cash"),
  paymentReference: z.string().trim().max(100).optional().or(z.literal("")),
}).refine(
  (data) => {
    // If not walk in, customerId should be provided
    if (!data.isWalkIn && !data.customerId) {
      return false;
    }
    return true;
  },
  {
    message: "Customer is required for credit or non-walk-in sales",
    path: ["customerId"],
  }
);

export const cancelSaleSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;
export type CreateProductSaleInput = z.input<typeof createProductSaleSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;

