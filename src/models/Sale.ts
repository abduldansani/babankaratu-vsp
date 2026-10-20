import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISale extends Document {
  bicycle: number;
  motorcycle: number;
  totalAmount: number;
  notes?: string;
  saleDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    bicycle: { type: Number, required: true, default: 0, min: 0 },
    motorcycle: { type: Number, required: true, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    saleDate: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const Sale: Model<ISale> =
  mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);

export default Sale;
