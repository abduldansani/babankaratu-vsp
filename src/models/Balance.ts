import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBalance extends Document {
  availableBalance: number;
  totalOutstanding: number; // Supplier payables (money owed to suppliers)
  customerDebt: number; // Customer receivables (money owed by customers)
  updatedAt: Date;
  createdAt: Date;
}

const BalanceSchema = new Schema<IBalance>(
  {
    availableBalance: { type: Number, required: true, default: 0 },
    totalOutstanding: { type: Number, required: true, default: 0 },
    customerDebt: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Balance: Model<IBalance> =
  mongoose.models.Balance || mongoose.model<IBalance>("Balance", BalanceSchema);

export default Balance;
