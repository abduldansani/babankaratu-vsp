"use server";

import dbConnect from "@/lib/dbConnect";
import { VehicleMake, VehicleModel, Product } from "@/models";
import {
  createVehicleMakeSchema,
  updateVehicleMakeSchema,
  createVehicleModelSchema,
  updateVehicleModelSchema,
  CreateVehicleMakeInput,
  UpdateVehicleMakeInput,
  CreateVehicleModelInput,
  UpdateVehicleModelInput,
} from "@/lib/validations/vehicle";
import { safeRevalidatePath } from "@/lib/safeRevalidate";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getVehicleMakes(): Promise<
  Array<{
    _id: string;
    name: string;
    normalizedName: string;
    modelCount: number;
    createdAt: string;
    updatedAt: string;
  }>
> {
  await dbConnect();

  const makes = await VehicleMake.find().sort({ name: 1 }).lean();

  const counts = await VehicleModel.aggregate([
    { $group: { _id: "$make", count: { $sum: 1 } } },
  ]);

  const countMap = new Map<string, number>();
  for (const c of counts) {
    countMap.set(String(c._id), c.count);
  }

  const result = makes.map((m) => ({
    _id: String(m._id),
    name: m.name,
    normalizedName: m.normalizedName,
    modelCount: countMap.get(String(m._id)) || 0,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : "",
    updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : "",
  }));

  return JSON.parse(JSON.stringify(result));
}

export async function createVehicleMake(
  rawInput: CreateVehicleMakeInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createVehicleMakeSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const existing = await VehicleMake.findOne({ normalizedName });
    if (existing) {
      return {
        success: false,
        error: `A vehicle make named "${validated.name}" already exists.`,
      };
    }

    const make = await VehicleMake.create({
      name: validated.name.trim(),
      normalizedName,
    });

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(make)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create vehicle make",
    };
  }
}

export async function updateVehicleMake(
  id: string,
  rawInput: UpdateVehicleMakeInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = updateVehicleMakeSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const duplicate = await VehicleMake.findOne({
      normalizedName,
      _id: { $ne: id },
    });
    if (duplicate) {
      return {
        success: false,
        error: `Another vehicle make named "${validated.name}" already exists.`,
      };
    }

    const updated = await VehicleMake.findByIdAndUpdate(
      id,
      { name: validated.name.trim(), normalizedName },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return { success: false, error: "Vehicle make not found." };
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
        error instanceof Error ? error.message : "Failed to update vehicle make",
    };
  }
}

export async function deleteVehicleMake(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    const dependentModels = await VehicleModel.countDocuments({ make: id });
    if (dependentModels > 0) {
      return {
        success: false,
        error: `Cannot delete vehicle make because ${dependentModels} vehicle model(s) belong to it. Remove or reassign the models first.`,
      };
    }

    const deleted = await VehicleMake.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false, error: "Vehicle make not found." };
    }

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete vehicle make",
    };
  }
}

export async function getVehicleModels(makeId?: string): Promise<
  Array<{
    _id: string;
    name: string;
    make: { _id: string; name: string };
    productFitmentCount: number;
    createdAt: string;
    updatedAt: string;
  }>
> {
  await dbConnect();

  const query: Record<string, unknown> = {};
  if (makeId) {
    query.make = makeId;
  }

  const models = await VehicleModel.find(query)
    .populate("make", "name")
    .sort({ name: 1 })
    .lean();

  const fitmentCounts = await Product.aggregate([
    { $unwind: "$vehicleFitments" },
    { $group: { _id: "$vehicleFitments.model", count: { $sum: 1 } } },
  ]);

  const fitmentMap = new Map<string, number>();
  for (const f of fitmentCounts) {
    fitmentMap.set(String(f._id), f.count);
  }

  const result = models.map((m: any) => ({
    _id: String(m._id),
    name: m.name,
    make: m.make
      ? { _id: String(m.make._id), name: m.make.name }
      : { _id: "", name: "Unknown" },
    productFitmentCount: fitmentMap.get(String(m._id)) || 0,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : "",
    updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : "",
  }));

  return JSON.parse(JSON.stringify(result));
}

export async function createVehicleModel(
  rawInput: CreateVehicleModelInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createVehicleModelSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const makeExists = await VehicleMake.findById(validated.make);
    if (!makeExists) {
      return { success: false, error: "Selected vehicle make does not exist." };
    }

    const existing = await VehicleModel.findOne({
      make: validated.make,
      normalizedName,
    });
    if (existing) {
      return {
        success: false,
        error: `A vehicle model named "${validated.name}" already exists under ${makeExists.name}.`,
      };
    }

    const model = await VehicleModel.create({
      name: validated.name.trim(),
      normalizedName,
      make: validated.make,
    });

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(model)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create vehicle model",
    };
  }
}

export async function updateVehicleModel(
  id: string,
  rawInput: UpdateVehicleModelInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = updateVehicleModelSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const currentModel = await VehicleModel.findById(id);
    if (!currentModel) {
      return { success: false, error: "Vehicle model not found." };
    }

    const targetMakeId = validated.make || currentModel.make;

    const duplicate = await VehicleModel.findOne({
      make: targetMakeId,
      normalizedName,
      _id: { $ne: id },
    });
    if (duplicate) {
      return {
        success: false,
        error: `Another vehicle model named "${validated.name}" already exists under this make.`,
      };
    }

    const updated = await VehicleModel.findByIdAndUpdate(
      id,
      {
        name: validated.name.trim(),
        normalizedName,
        ...(validated.make ? { make: validated.make } : {}),
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
        error instanceof Error ? error.message : "Failed to update vehicle model",
    };
  }
}

export async function deleteVehicleModel(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    const dependentProducts = await Product.countDocuments({
      "vehicleFitments.model": id,
    });
    if (dependentProducts > 0) {
      return {
        success: false,
        error: `Cannot delete vehicle model because ${dependentProducts} product(s) specify compatibility with it. Remove the vehicle fitment from those products first.`,
      };
    }

    const deleted = await VehicleModel.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false, error: "Vehicle model not found." };
    }

    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/products");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete vehicle model",
    };
  }
}
