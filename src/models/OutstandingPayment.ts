import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOutstandingPayment extends Document {
  amount: number;
  recipient?: string;
  purchaseId?: mongoose.Types.ObjectId;
  notes?: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutstandingPaymentSchema = new Schema<IOutstandingPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    recipient: { type: String, trim: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    notes: { type: String, trim: true },
    paidAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const OutstandingPayment: Model<IOutstandingPayment> =
  mongoose.models.OutstandingPayment ||
  mongoose.model<IOutstandingPayment>(
    "OutstandingPayment",
    OutstandingPaymentSchema
  );

export default OutstandingPayment;
