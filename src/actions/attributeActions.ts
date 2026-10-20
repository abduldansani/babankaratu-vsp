"use server";

import dbConnect from "@/lib/dbConnect";
import { ProductAttributeDefinition, Category, Product } from "@/models";
import {
  createProductAttributeSchema,
  updateProductAttributeSchema,
  CreateProductAttributeInput,
  UpdateProductAttributeInput,
} from "@/lib/validations/product-attribute";
import { safeRevalidatePath } from "@/lib/safeRevalidate";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getAttributeDefinitions(categoryId: string) {
  await dbConnect();
  if (!categoryId) return [];

  const definitions = await ProductAttributeDefinition.find({
    category: categoryId,
  })
    .sort({ displayOrder: 1, name: 1 })
    .lean();

  return JSON.parse(JSON.stringify(definitions));
}

export async function createAttributeDefinition(
  rawInput: CreateProductAttributeInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createProductAttributeSchema.parse(rawInput);

    const categoryExists = await Category.findById(validated.category);
    if (!categoryExists) {
      return { success: false, error: "Selected category does not exist." };
    }

    const cleanKey = validated.key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "");

    const existing = await ProductAttributeDefinition.findOne({
      category: validated.category,
      key: cleanKey,
    });

    if (existing) {
      return {
        success: false,
        error: `An attribute with the key "${cleanKey}" already exists in ${categoryExists.name}.`,
      };
    }

    const cleanOptions = (validated.options || [])
      .map((o) => o.trim())
      .filter(Boolean);

    const attr = await ProductAttributeDefinition.create({
      name: validated.name.trim(),
      key: cleanKey,
      category: validated.category,
      type: validated.type,
      required: validated.required ?? false,
      options: cleanOptions,
      unit: validated.unit?.trim() || "",
      displayOrder: validated.displayOrder ?? 0,
    });

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(attr)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create attribute definition",
    };
  }
}

export async function updateAttributeDefinition(
  id: string,
  rawInput: UpdateProductAttributeInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = updateProductAttributeSchema.parse(rawInput);

    const current = await ProductAttributeDefinition.findById(id);
    if (!current) {
      return { success: false, error: "Attribute definition not found." };
    }

    const cleanOptions = (validated.options || [])
      .map((o) => o.trim())
      .filter(Boolean);

    // If type is changing or changed, check if existing products have data
    if (validated.type && validated.type !== current.type) {
      const productsWithData = await Product.countDocuments({
        category: current.category,
        [`attributes.${current.key}`]: { $exists: true, $ne: null },
      });
      if (productsWithData > 0) {
        return {
          success: false,
          error: `Cannot change type of "${current.name}" because ${productsWithData} product(s) already contain data for this attribute.`,
        };
      }
    }

    const updated = await ProductAttributeDefinition.findByIdAndUpdate(
      id,
      {
        name: validated.name.trim(),
        ...(validated.type ? { type: validated.type } : {}),
        required: validated.required ?? current.required,
        options: cleanOptions,
        unit: validated.unit !== undefined ? validated.unit.trim() : current.unit,
        displayOrder: validated.displayOrder ?? current.displayOrder,
      },
      { new: true, runValidators: true }
    );

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update attribute definition",
    };
  }
}

export async function deleteAttributeDefinition(
  id: string
): Promise<ActionResult> {
  try {
    await dbConnect();

    const attr = await ProductAttributeDefinition.findById(id);
    if (!attr) {
      return { success: false, error: "Attribute definition not found." };
    }

    // Check if any product has data stored for this attribute key
    const productsWithData = await Product.countDocuments({
      category: attr.category,
      [`attributes.${attr.key}`]: { $exists: true, $ne: null },
    });

    if (productsWithData > 0) {
      return {
        success: false,
        error: `Cannot delete attribute "${attr.name}" because ${productsWithData} product(s) have data stored for it. Delete or clear the attribute on those products first.`,
      };
    }

    await ProductAttributeDefinition.findByIdAndDelete(id);

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete attribute definition",
    };
  }
}
