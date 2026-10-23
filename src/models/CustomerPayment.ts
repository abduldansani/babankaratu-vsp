import mongoose, { Document, Schema, Model } from "mongoose";

export type CustomerPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "pos"
  | "cheque"
  | "other";

export type CustomerPaymentStatus = "active" | "reversed";

export interface IPaymentAllocation {
  saleId: mongoose.Types.ObjectId;
  saleNumber?: string;
  amount: number;
}

export interface ICustomerPayment extends Document {
  paymentNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: CustomerPaymentMethod;
  reference?: string;
  notes?: string;
  allocations: IPaymentAllocation[];
  status: CustomerPaymentStatus;
  reversedAt?: Date;
  reversalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentAllocationSchema = new Schema<IPaymentAllocation>(
  {
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },
    saleNumber: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
  },
  { _id: false }
);

const CustomerPaymentSchema = new Schema<ICustomerPayment>(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
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
      enum: ["cash", "bank_transfer", "pos", "cheque", "other"],
      default: "cash",
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    allocations: {
      type: [PaymentAllocationSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "reversed"],
      default: "active",
      index: true,
    },
    reversedAt: { type: Date },
    reversalReason: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

CustomerPaymentSchema.index({ customerId: 1, paymentDate: -1 });
CustomerPaymentSchema.index({ "allocations.saleId": 1 });

const CustomerPayment: Model<ICustomerPayment> =
  mongoose.models.CustomerPayment ||
  mongoose.model<ICustomerPayment>("CustomerPayment", CustomerPaymentSchema);

export default CustomerPayment;
