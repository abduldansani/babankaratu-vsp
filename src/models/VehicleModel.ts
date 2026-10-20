import mongoose, { Document, Schema, Model } from "mongoose";

export interface IVehicleModel extends Document {
  name: string;
  normalizedName: string;
  make: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleModelSchema = new Schema<IVehicleModel>(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    make: {
      type: Schema.Types.ObjectId,
      ref: "VehicleMake",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

VehicleModelSchema.index({ make: 1, normalizedName: 1 }, { unique: true });

VehicleModelSchema.pre("validate", function () {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
});

const VehicleModel: Model<IVehicleModel> =
  mongoose.models.VehicleModel ||
  mongoose.model<IVehicleModel>("VehicleModel", VehicleModelSchema);

export default VehicleModel;
