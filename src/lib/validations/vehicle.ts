import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createVehicleMakeSchema = z.object({
  name: z.string().trim().min(1, "Vehicle make name is required").max(100),
});

export const updateVehicleMakeSchema = z.object({
  name: z.string().trim().min(1, "Vehicle make name is required").max(100),
});

export const createVehicleModelSchema = z.object({
  name: z.string().trim().min(1, "Vehicle model name is required").max(100),
  make: z.string().regex(objectIdRegex, "Invalid vehicle make ID"),
});

export const updateVehicleModelSchema = z.object({
  name: z.string().trim().min(1, "Vehicle model name is required").max(100),
  make: z.string().regex(objectIdRegex, "Invalid vehicle make ID").optional(),
});

export type CreateVehicleMakeInput = z.infer<typeof createVehicleMakeSchema>;
export type UpdateVehicleMakeInput = z.infer<typeof updateVehicleMakeSchema>;
export type CreateVehicleModelInput = z.infer<typeof createVehicleModelSchema>;
export type UpdateVehicleModelInput = z.infer<typeof updateVehicleModelSchema>;
