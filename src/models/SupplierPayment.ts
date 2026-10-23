import mongoose, { Document, Schema, Model } from "mongoose";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "cheque"
  | "pos"
  | "other";

export type PaymentStatus = "active" | "reversed";

export interface ISupplierPayment extends Document {
  paymentNumber: string;
  supplier: mongoose.Types.ObjectId;
  purchase?: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  reversedAt?: Date;
  reversalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierPaymentSchema = new Schema<ISupplierPayment>(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    purchase: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentDate: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "cheque", "pos", "other"],
      default: "cash",
      required: true,
    },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "reversed"],
      default: "active",
      index: true,
    },
    reversedAt: { type: Date },
    reversalReason: { type: String, trim: true },
  },
  { timestamps: true }
);

const SupplierPayment: Model<ISupplierPayment> =
  mongoose.models.SupplierPayment ||
  mongoose.model<ISupplierPayment>("SupplierPayment", SupplierPaymentSchema);

export default SupplierPayment;
