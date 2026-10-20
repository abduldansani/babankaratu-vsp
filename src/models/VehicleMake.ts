import mongoose, { Document, Schema, Model } from "mongoose";

export interface IVehicleMake extends Document {
  name: string;
  normalizedName: string;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleMakeSchema = new Schema<IVehicleMake>(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Pre-validate hook to keep normalizedName in sync
VehicleMakeSchema.pre("validate", function () {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
});

const VehicleMake: Model<IVehicleMake> =
  mongoose.models.VehicleMake ||
  mongoose.model<IVehicleMake>("VehicleMake", VehicleMakeSchema);

export default VehicleMake;
