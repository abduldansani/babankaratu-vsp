import mongoose, { Document, Schema, Model } from "mongoose";

export type PurchaseStatus = "draft" | "posted" | "cancelled";
export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";

export interface IPurchaseItem {
  product: mongoose.Types.ObjectId;
  productName: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface IPurchase extends Document {
  purchaseNumber?: string;
  supplierId?: mongoose.Types.ObjectId;
  supplier?: string; // string for legacy compatibility
  supplierName?: string;
  purchaseDate: Date;
  status: PurchaseStatus;
  paymentStatus: PurchasePaymentStatus;
  items: IPurchaseItem[];
  subtotal: number;
  transport: number;
  total: number;
  paid: number;
  balance: number;
  notes?: string;
  postedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true, trim: true },
    partNumber: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    purchaseNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      index: true,
    },
    supplier: { type: String, trim: true }, // Legacy string or display name
    supplierName: { type: String, trim: true },
    purchaseDate: { type: Date, default: () => new Date(), index: true },
    status: {
      type: String,
      enum: ["draft", "posted", "cancelled"],
      default: "posted",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
      index: true,
    },
    items: {
      type: [PurchaseItemSchema],
      default: [],
    },
    subtotal: { type: Number, default: 0, min: 0 },
    transport: { type: Number, required: true, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paid: { type: Number, required: true, default: 0, min: 0 },
    balance: { type: Number, required: true, default: 0, min: 0 },
    notes: { type: String, trim: true },
    postedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// Indexes
PurchaseSchema.index({ supplierId: 1, purchaseDate: -1 });
PurchaseSchema.index({ status: 1, purchaseDate: -1 });

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase ||
  mongoose.model<IPurchase>("Purchase", PurchaseSchema);

export default Purchase;
