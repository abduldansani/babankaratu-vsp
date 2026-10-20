import mongoose, { Document, Schema, Model } from "mongoose";

export interface IVehicleFitment {
  model: mongoose.Types.ObjectId;
  yearFrom?: number;
  yearTo?: number;
  notes?: string;
}

export interface IProduct extends Document {
  name: string;
  normalizedName: string;
  partNumber?: string;
  normalizedPartNumber?: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  brand: mongoose.Types.ObjectId;
  vehicleFitments: IVehicleFitment[];
  attributes: Record<string, unknown>;
  costPrice: mongoose.Types.Decimal128;
  sellingPrice: mongoose.Types.Decimal128;
  quantityOnHand: number;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleFitmentSchema = new Schema<IVehicleFitment>(
  {
    model: {
      type: Schema.Types.ObjectId,
      ref: "VehicleModel",
      required: true,
    },
    yearFrom: { type: Number, min: 1900, max: 2100 },
    yearTo: { type: Number, min: 1900, max: 2100 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    partNumber: { type: String, trim: true },
    normalizedPartNumber: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: { type: String, trim: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    vehicleFitments: {
      type: [VehicleFitmentSchema],
      default: [],
    },
    attributes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    costPrice: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    sellingPrice: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    quantityOnHand: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret: Record<string, any>) {
        if (ret.costPrice && typeof ret.costPrice.toString === "function") {
          ret.costPrice = parseFloat(ret.costPrice.toString());
        }
        if (ret.sellingPrice && typeof ret.sellingPrice.toString === "function") {
          ret.sellingPrice = parseFloat(ret.sellingPrice.toString());
        }
        return ret;
      },
    },
  }
);

// Indexes
ProductSchema.index({ normalizedPartNumber: 1 }, { sparse: true });
ProductSchema.index({ "vehicleFitments.model": 1 });
ProductSchema.index({ name: "text", partNumber: "text", description: "text" });

ProductSchema.pre("validate", function () {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
  if (this.partNumber && this.partNumber.trim().length > 0) {
    this.normalizedPartNumber = this.partNumber.trim().toLowerCase();
  } else {
    this.normalizedPartNumber = undefined;
  }
});

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
