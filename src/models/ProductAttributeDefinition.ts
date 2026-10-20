import mongoose, { Document, Schema, Model } from "mongoose";

export type AttributeType = "text" | "number" | "boolean" | "select" | "multiselect";

export interface IProductAttributeDefinition extends Document {
  name: string;
  key: string;
  category: mongoose.Types.ObjectId;
  type: AttributeType;
  required: boolean;
  options: string[];
  unit?: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductAttributeDefinitionSchema = new Schema<IProductAttributeDefinition>(
  {
    name: { type: String, required: true, trim: true },
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["text", "number", "boolean", "select", "multiselect"],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: {
      type: [String],
      default: [],
    },
    unit: { type: String, trim: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductAttributeDefinitionSchema.index(
  { category: 1, key: 1 },
  { unique: true }
);
ProductAttributeDefinitionSchema.index({ category: 1, displayOrder: 1 });

// Normalize key to valid slug/identifier
ProductAttributeDefinitionSchema.pre("validate", function () {
  if (this.key) {
    this.key = this.key
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "");
  }
});

const ProductAttributeDefinition: Model<IProductAttributeDefinition> =
  mongoose.models.ProductAttributeDefinition ||
  mongoose.model<IProductAttributeDefinition>(
    "ProductAttributeDefinition",
    ProductAttributeDefinitionSchema
  );

export default ProductAttributeDefinition;
