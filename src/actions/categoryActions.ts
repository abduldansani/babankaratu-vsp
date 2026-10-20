"use server";

import dbConnect from "@/lib/dbConnect";
import { Category, Product, ProductAttributeDefinition } from "@/models";
import {
  createCategorySchema,
  updateCategorySchema,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/lib/validations/category";
import { safeRevalidatePath } from "@/lib/safeRevalidate";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CategoryWithCounts {
  _id: string;
  name: string;
  normalizedName: string;
  description?: string;
  productCount: number;
  attributeCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getCategories(): Promise<CategoryWithCounts[]> {
  await dbConnect();

  const categories = await Category.find().sort({ name: 1 }).lean();

  const [productCounts, attributeCounts] = await Promise.all([
    Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
    ProductAttributeDefinition.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ]);

  const prodMap = new Map<string, number>();
  for (const p of productCounts) {
    prodMap.set(String(p._id), p.count);
  }

  const attrMap = new Map<string, number>();
  for (const a of attributeCounts) {
    attrMap.set(String(a._id), a.count);
  }

  const result = categories.map((c) => ({
    _id: String(c._id),
    name: c.name,
    normalizedName: c.normalizedName,
    description: c.description || "",
    productCount: prodMap.get(String(c._id)) || 0,
    attributeCount: attrMap.get(String(c._id)) || 0,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : "",
  }));

  return JSON.parse(JSON.stringify(result));
}

export async function getCategoryById(id: string) {
  await dbConnect();
  const category = await Category.findById(id).lean();
  if (!category) return null;
  return JSON.parse(JSON.stringify(category));
}

export async function createCategory(
  rawInput: CreateCategoryInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createCategorySchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const existing = await Category.findOne({ normalizedName });
    if (existing) {
      return {
        success: false,
        error: `A category named "${validated.name}" already exists.`,
      };
    }

    const category = await Category.create({
      name: validated.name.trim(),
      normalizedName,
      description: validated.description?.trim() || "",
    });

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(category)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

export async function updateCategory(
  id: string,
  rawInput: UpdateCategoryInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = updateCategorySchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const duplicate = await Category.findOne({
      normalizedName,
      _id: { $ne: id },
    });
    if (duplicate) {
      return {
        success: false,
        error: `Another category named "${validated.name}" already exists.`,
      };
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      {
        name: validated.name.trim(),
        normalizedName,
        description: validated.description?.trim() || "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return { success: false, error: "Category not found." };
    }

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
        error instanceof Error ? error.message : "Failed to update category",
    };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    const dependentProducts = await Product.countDocuments({ category: id });
    if (dependentProducts > 0) {
      return {
        success: false,
        error: `Cannot delete category because ${dependentProducts} product(s) are currently assigned to it. Reassign or remove those products first.`,
      };
    }

    const dependentAttrs = await ProductAttributeDefinition.countDocuments({
      category: id,
    });
    if (dependentAttrs > 0) {
      return {
        success: false,
        error: `Cannot delete category because ${dependentAttrs} attribute definition(s) exist for it. Delete those attribute definitions first.`,
      };
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false, error: "Category not found." };
    }

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}
