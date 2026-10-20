"use server";

import dbConnect from "@/lib/dbConnect";
import { Brand, Product } from "@/models";
import {
  createBrandSchema,
  updateBrandSchema,
  CreateBrandInput,
  UpdateBrandInput,
} from "@/lib/validations/brand";
import { safeRevalidatePath } from "@/lib/safeRevalidate";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BrandWithCount {
  _id: string;
  name: string;
  normalizedName: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getBrands(): Promise<BrandWithCount[]> {
  await dbConnect();

  const brands = await Brand.find().sort({ name: 1 }).lean();

  const productCounts = await Product.aggregate([
    { $group: { _id: "$brand", count: { $sum: 1 } } },
  ]);

  const countMap = new Map<string, number>();
  for (const p of productCounts) {
    countMap.set(String(p._id), p.count);
  }

  const result = brands.map((b) => ({
    _id: String(b._id),
    name: b.name,
    normalizedName: b.normalizedName,
    productCount: countMap.get(String(b._id)) || 0,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : "",
    updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : "",
  }));

  return JSON.parse(JSON.stringify(result));
}

export async function createBrand(
  rawInput: CreateBrandInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createBrandSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const existing = await Brand.findOne({ normalizedName });
    if (existing) {
      return {
        success: false,
        error: `A brand named "${validated.name}" already exists.`,
      };
    }

    const brand = await Brand.create({
      name: validated.name.trim(),
      normalizedName,
    });

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(brand)),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create brand",
    };
  }
}

export async function updateBrand(
  id: string,
  rawInput: UpdateBrandInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = updateBrandSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const duplicate = await Brand.findOne({
      normalizedName,
      _id: { $ne: id },
    });
    if (duplicate) {
      return {
        success: false,
        error: `Another brand named "${validated.name}" already exists.`,
      };
    }

    const updated = await Brand.findByIdAndUpdate(
      id,
      { name: validated.name.trim(), normalizedName },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return { success: false, error: "Brand not found." };
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
      error: error instanceof Error ? error.message : "Failed to update brand",
    };
  }
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    const dependentProducts = await Product.countDocuments({ brand: id });
    if (dependentProducts > 0) {
      return {
        success: false,
        error: `Cannot delete brand because ${dependentProducts} product(s) are associated with it. Reassign or remove those products first.`,
      };
    }

    const deleted = await Brand.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false, error: "Brand not found." };
    }

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete brand",
    };
  }
}
