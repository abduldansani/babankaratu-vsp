import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const attributeTypeEnum = z.enum([
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
]);

export const createProductAttributeSchema = z
  .object({
    name: z.string().trim().min(1, "Attribute name is required").max(100),
    key: z
      .string()
      .trim()
      .min(1, "Attribute key is required")
      .max(50)
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Key can only contain letters, numbers, and underscores"
      ),
    category: z.string().regex(objectIdRegex, "Invalid category ID"),
    type: attributeTypeEnum,
    required: z.boolean().default(false),
    options: z.array(z.string().trim()).default([]),
    unit: z.string().trim().max(30).optional().or(z.literal("")),
    displayOrder: z.number().int().default(0),
  })
  .refine(
    (data) => {
      if (data.type === "select" || data.type === "multiselect") {
        const cleanOptions = data.options.filter((opt) => opt.length > 0);
        return cleanOptions.length > 0;
      }
      return true;
    },
    {
      message: "At least one option is required for select and multiselect types",
      path: ["options"],
    }
  );

export const updateProductAttributeSchema = z
  .object({
    name: z.string().trim().min(1, "Attribute name is required").max(100),
    type: attributeTypeEnum.optional(),
    required: z.boolean().default(false),
    options: z.array(z.string().trim()).default([]),
    unit: z.string().trim().max(30).optional().or(z.literal("")),
    displayOrder: z.number().int().default(0),
  })
  .refine(
    (data) => {
      if (data.type === "select" || data.type === "multiselect") {
        const cleanOptions = data.options.filter((opt) => opt.length > 0);
        return cleanOptions.length > 0;
      }
      return true;
    },
    {
      message: "At least one option is required for select and multiselect types",
      path: ["options"],
    }
  );

export type CreateProductAttributeInput = z.infer<
  typeof createProductAttributeSchema
>;
export type UpdateProductAttributeInput = z.infer<
  typeof updateProductAttributeSchema
>;
