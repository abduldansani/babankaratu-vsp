import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProfitTaking extends Document {
  amount: number;
  recipient?: string;
  notes?: string;
  takenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProfitTakingSchema = new Schema<IProfitTaking>(
  {
    amount: { type: Number, required: true, min: 0 },
    recipient: { type: String, trim: true },
    notes: { type: String, trim: true },
    takenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const ProfitTaking: Model<IProfitTaking> =
  mongoose.models.ProfitTaking ||
  mongoose.model<IProfitTaking>("ProfitTaking", ProfitTakingSchema);

export default ProfitTaking;
