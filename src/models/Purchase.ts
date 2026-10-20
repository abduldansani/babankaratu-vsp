import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPurchase extends Document {
  supplier?: string;
  total: number;
  paid: number;
  balance: number;
  transport: number;
  notes?: string;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
  {
    supplier: { type: String, trim: true },
    total: { type: Number, required: true, min: 0 },
    paid: { type: Number, required: true, default: 0, min: 0 },
    balance: { type: Number, required: true, default: 0, min: 0 },
    transport: { type: Number, required: true, default: 0, min: 0 },
    notes: { type: String, trim: true },
    purchaseDate: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase ||
  mongoose.model<IPurchase>("Purchase", PurchaseSchema);

export default Purchase;
