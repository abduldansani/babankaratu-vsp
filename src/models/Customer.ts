import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  normalizedName: string;
  phone?: string;
  normalizedPhone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    normalizedPhone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CustomerSchema.pre("validate", function () {
  if (this.name) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
  if (this.phone) {
    this.normalizedPhone = this.phone.replace(/[^0-9+]/g, "");
  } else {
    this.normalizedPhone = undefined;
  }
});

// Indexes for fast searching
CustomerSchema.index({ normalizedName: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ normalizedPhone: 1 }, { sparse: true });
CustomerSchema.index({ name: "text", phone: "text", notes: "text" });

const Customer: Model<ICustomer> =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
