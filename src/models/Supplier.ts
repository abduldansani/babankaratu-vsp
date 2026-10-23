import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  normalizedName: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
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
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    contactPerson: { type: String, trim: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SupplierSchema.pre("validate", function () {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
});

const Supplier: Model<ISupplier> =
  mongoose.models.Supplier ||
  mongoose.model<ISupplier>("Supplier", SupplierSchema);

export default Supplier;
