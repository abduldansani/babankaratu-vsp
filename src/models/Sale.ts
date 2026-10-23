import mongoose, { Document, Schema, Model } from "mongoose";

export type SaleStatus = "confirmed" | "cancelled";
export type SalePaymentStatus = "unpaid" | "partial" | "paid";

export interface ISaleItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number; // Historical cost snapshot for COGS & profit reporting
  lineTotal: number;
}

export interface ISale extends Document {
  // Human-readable receipt number
  saleNumber?: string;

  // Customer link (optional for walk-in or legacy)
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  isWalkIn: boolean;

  // Inventory line items
  items: ISaleItem[];

  // Financials
  subtotal: number;
  discount: number;
  totalAmount: number; // Shared across legacy & new product-based sales
  paidAmount: number;
  balance: number;

  paymentStatus: SalePaymentStatus;
  status: SaleStatus;

  // Legacy fields preserved for backward compatibility
  bicycle: number;
  motorcycle: number;
  isLegacy: boolean;

  notes?: string;
  saleDate: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true, trim: true },
    partNumber: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    saleNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
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
    customerPhone: {
      type: String,
      trim: true,
    },
    isWalkIn: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [SaleItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "paid",
      index: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true,
    },
    // Legacy compatibility fields
    bicycle: {
      type: Number,
      default: 0,
      min: 0,
    },
    motorcycle: {
      type: Number,
      default: 0,
      min: 0,
    },
    isLegacy: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    saleDate: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
SaleSchema.index({ customerId: 1, saleDate: -1 });
SaleSchema.index({ status: 1, saleDate: -1 });
SaleSchema.index({ paymentStatus: 1, saleDate: -1 });

const Sale: Model<ISale> =
  mongoose.models.Sale || mongoose.model<ISale>("Sale", SaleSchema);

export default Sale;
