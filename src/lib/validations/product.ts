import { z } from "zod";
import ProductAttributeDefinition from "../../models/ProductAttributeDefinition";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const vehicleFitmentInputSchema = z.object({
  model: z.string().regex(objectIdRegex, "Invalid vehicle model ID"),
  yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
  notes: z.string().trim().max(200).optional().or(z.literal("")),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(200),
  partNumber: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  category: z.string().regex(objectIdRegex, "Valid category is required"),
  brand: z.string().regex(objectIdRegex, "Valid brand is required"),
  vehicleFitments: z.array(vehicleFitmentInputSchema).default([]),
  attributes: z.record(z.string(), z.unknown()).default({}),
  costPrice: z.coerce
    .number()
    .min(0, "Cost price must be zero or a positive amount"),
  sellingPrice: z.coerce
    .number()
    .min(0, "Selling price must be zero or a positive amount"),
  quantityOnHand: z.coerce
    .number()
    .int("Stock quantity must be a whole number")
    .min(0, "Stock quantity cannot be negative")
    .default(0),
  reorderLevel: z.coerce
    .number()
    .int("Reorder level must be a whole number")
    .min(0, "Reorder level cannot be negative")
    .default(5),
});

export const updateProductSchema = createProductSchema;

export type VehicleFitmentInput = z.infer<typeof vehicleFitmentInputSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/**
 * Validates dynamic attributes against definitions stored for the category
 */
export async function validateDynamicCategoryAttributes(
  categoryId: string,
  rawAttributes: Record<string, unknown> = {}
): Promise<{
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, unknown>;
}> {
  const definitions = await ProductAttributeDefinition.find({
    category: categoryId,
  }).sort({ displayOrder: 1 });

  const errors: Record<string, string> = {};
  const sanitized: Record<string, unknown> = {};

  for (const def of definitions) {
    const key = def.key;
    const value = rawAttributes[key];

    const isProvided =
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0);

    if (def.required && !isProvided) {
      errors[key] = `${def.name} is required`;
      continue;
    }

    if (!isProvided) {
      continue;
    }

    switch (def.type) {
      case "text": {
        if (typeof value !== "string" && typeof value !== "number") {
          errors[key] = `${def.name} must be text`;
        } else {
          sanitized[key] = String(value).trim();
        }
        break;
      }

      case "number": {
        const num = typeof value === "number" ? value : parseFloat(String(value));
        if (isNaN(num)) {
          errors[key] = `${def.name} must be a valid number`;
        } else {
          sanitized[key] = num;
        }
        break;
      }

      case "boolean": {
        if (typeof value === "boolean") {
          sanitized[key] = value;
        } else if (value === "true" || value === 1 || value === "1") {
          sanitized[key] = true;
        } else if (value === "false" || value === 0 || value === "0") {
          sanitized[key] = false;
        } else {
          errors[key] = `${def.name} must be true or false`;
        }
        break;
      }

      case "select": {
        const strVal = String(value).trim();
        if (!def.options.includes(strVal)) {
          errors[key] = `${def.name} must be one of: ${def.options.join(", ")}`;
        } else {
          sanitized[key] = strVal;
        }
        break;
      }

      case "multiselect": {
        let arrVal: string[] = [];
        if (Array.isArray(value)) {
          arrVal = value.map((v) => String(v).trim());
        } else if (typeof value === "string") {
          arrVal = value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }

        const invalidOpts = arrVal.filter((opt) => !def.options.includes(opt));
        if (invalidOpts.length > 0) {
          errors[key] = `Invalid option(s) for ${def.name}: ${invalidOpts.join(", ")}`;
        } else {
          sanitized[key] = arrVal;
        }
        break;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}
