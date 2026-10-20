"use server";

import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import {
  Product,
  Category,
  Brand,
  VehicleModel,
  VehicleMake,
  ProductAttributeDefinition,
} from "@/models";
import {
  createProductSchema,
  updateProductSchema,
  validateDynamicCategoryAttributes,
  CreateProductInput,
  UpdateProductInput,
} from "@/lib/validations/product";
import { safeRevalidatePath } from "@/lib/safeRevalidate";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface ProductListParams {
  search?: string;
  category?: string;
  brand?: string;
  stockStatus?: "all" | "in_stock" | "low_stock" | "out_of_stock";
  page?: number;
  limit?: number;
}

export interface PopulatedVehicleFitment {
  model: {
    _id: string;
    name: string;
    make?: { _id: string; name: string };
  };
  yearFrom?: number;
  yearTo?: number;
  notes?: string;
}

export interface ProductViewItem {
  _id: string;
  name: string;
  partNumber?: string;
  description?: string;
  category: { _id: string; name: string };
  brand: { _id: string; name: string };
  vehicleFitments: PopulatedVehicleFitment[];
  attributes: Record<string, unknown>;
  costPrice: number;
  sellingPrice: number;
  quantityOnHand: number;
  reorderLevel: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: ProductViewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalInventoryValue: number;
  };
}

function formatProductLean(doc: any): ProductViewItem {
  const costPrice =
    doc.costPrice && typeof doc.costPrice.toString === "function"
      ? parseFloat(doc.costPrice.toString())
      : Number(doc.costPrice || 0);

  const sellingPrice =
    doc.sellingPrice && typeof doc.sellingPrice.toString === "function"
      ? parseFloat(doc.sellingPrice.toString())
      : Number(doc.sellingPrice || 0);

  const qoh = Number(doc.quantityOnHand || 0);
  const reorder = Number(doc.reorderLevel || 0);

  return {
    _id: String(doc._id),
    name: doc.name,
    partNumber: doc.partNumber || "",
    description: doc.description || "",
    category: doc.category
      ? { _id: String(doc.category._id), name: doc.category.name }
      : { _id: "", name: "Uncategorized" },
    brand: doc.brand
      ? { _id: String(doc.brand._id), name: doc.brand.name }
      : { _id: "", name: "Unbranded" },
    vehicleFitments: (doc.vehicleFitments || []).map((vf: any) => ({
      model: vf.model
        ? {
            _id: String(vf.model._id),
            name: vf.model.name,
            make: vf.model.make
              ? { _id: String(vf.model.make._id), name: vf.model.make.name }
              : undefined,
          }
        : { _id: "", name: "Unknown Model" },
      yearFrom: vf.yearFrom,
      yearTo: vf.yearTo,
      notes: vf.notes || "",
    })),
    attributes: doc.attributes || {},
    costPrice,
    sellingPrice,
    quantityOnHand: qoh,
    reorderLevel: reorder,
    isLowStock: qoh > 0 && qoh <= reorder,
    isOutOfStock: qoh <= 0,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

export async function getProducts(
  params: ProductListParams = {}
): Promise<ProductListResponse> {
  await dbConnect();

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 15));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { partNumber: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  if (params.category && params.category !== "all") {
    filter.category = params.category;
  }

  if (params.brand && params.brand !== "all") {
    filter.brand = params.brand;
  }

  if (params.stockStatus) {
    if (params.stockStatus === "out_of_stock") {
      filter.quantityOnHand = { $lte: 0 };
    } else if (params.stockStatus === "low_stock") {
      filter.$expr = {
        $and: [
          { $gt: ["$quantityOnHand", 0] },
          { $lte: ["$quantityOnHand", "$reorderLevel"] },
        ],
      };
    } else if (params.stockStatus === "in_stock") {
      filter.$expr = {
        $gt: ["$quantityOnHand", "$reorderLevel"],
      };
    }
  }

  const [rawProducts, totalCount, allProducts] = await Promise.all([
    Product.find(filter)
      .populate("category", "name")
      .populate({
        path: "brand",
        select: "name",
      })
      .populate({
        path: "vehicleFitments.model",
        select: "name make",
        populate: { path: "make", select: "name" },
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
    Product.find({}, "quantityOnHand reorderLevel costPrice").lean(),
  ]);

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValue = 0;

  for (const p of allProducts) {
    const q = Number(p.quantityOnHand || 0);
    const r = Number(p.reorderLevel || 0);
    const cost =
      p.costPrice && typeof p.costPrice.toString === "function"
        ? parseFloat(p.costPrice.toString())
        : Number(p.costPrice || 0);

    totalInventoryValue += q * cost;

    if (q <= 0) {
      outOfStockCount++;
    } else if (q <= r) {
      lowStockCount++;
    }
  }

  const items = rawProducts.map(formatProductLean);

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
    metrics: {
      totalProducts: allProducts.length,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue,
    },
  };
}

export async function getProductById(
  id: string
): Promise<ProductViewItem | null> {
  await dbConnect();

  const product = await Product.findById(id)
    .populate("category", "name")
    .populate("brand", "name")
    .populate({
      path: "vehicleFitments.model",
      select: "name make",
      populate: { path: "make", select: "name" },
    })
    .lean();

  if (!product) return null;
  return formatProductLean(product);
}

export async function createProduct(
  rawInput: CreateProductInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createProductSchema.parse(rawInput);

    // 1. Verify category exists
    const categoryExists = await Category.findById(validated.category);
    if (!categoryExists) {
      return { success: false, error: "Selected category does not exist." };
    }

    // 2. Verify brand exists
    const brandExists = await Brand.findById(validated.brand);
    if (!brandExists) {
      return { success: false, error: "Selected brand does not exist." };
    }

    // 3. Verify vehicle fitments models exist
    if (validated.vehicleFitments.length > 0) {
      const modelIds = validated.vehicleFitments.map((vf) => vf.model);
      const existingModelsCount = await VehicleModel.countDocuments({
        _id: { $in: modelIds },
      });
      if (existingModelsCount !== modelIds.length) {
        return {
          success: false,
          error: "One or more vehicle models in fitment list do not exist.",
        };
      }
    }

    // 4. Validate dynamic attributes against category definitions
    const attrValidation = await validateDynamicCategoryAttributes(
      validated.category,
      validated.attributes
    );

    if (!attrValidation.valid) {
      return {
        success: false,
        error: "Please complete all required product specifications correctly.",
        fieldErrors: attrValidation.errors,
      };
    }

    // 5. Check partNumber uniqueness if provided
    const cleanPartNumber = validated.partNumber?.trim();
    if (cleanPartNumber && cleanPartNumber.length > 0) {
      const duplicatePart = await Product.findOne({
        normalizedPartNumber: cleanPartNumber.toLowerCase(),
      });
      if (duplicatePart) {
        return {
          success: false,
          error: `A product with part number "${cleanPartNumber}" already exists (${duplicatePart.name}).`,
        };
      }
    }

    // 6. Create product with precise Decimal128
    const costDecimal = mongoose.Types.Decimal128.fromString(
      validated.costPrice.toFixed(2)
    );
    const sellingDecimal = mongoose.Types.Decimal128.fromString(
      validated.sellingPrice.toFixed(2)
    );

    const product = await Product.create({
      name: validated.name.trim(),
      partNumber: cleanPartNumber || undefined,
      description: validated.description?.trim() || undefined,
      category: validated.category,
      brand: validated.brand,
      vehicleFitments: validated.vehicleFitments,
      attributes: attrValidation.sanitized,
      costPrice: costDecimal,
      sellingPrice: sellingDecimal,
      quantityOnHand: Math.floor(validated.quantityOnHand),
      reorderLevel: Math.floor(validated.reorderLevel),
    });

    safeRevalidatePath("/products");
    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/");

    return {
      success: true,
      data: { _id: String(product._id) },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

export async function updateProduct(
  id: string,
  rawInput: UpdateProductInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = updateProductSchema.parse(rawInput);

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return { success: false, error: "Product not found." };
    }

    // 1. Verify category
    const categoryExists = await Category.findById(validated.category);
    if (!categoryExists) {
      return { success: false, error: "Selected category does not exist." };
    }

    // 2. Verify brand
    const brandExists = await Brand.findById(validated.brand);
    if (!brandExists) {
      return { success: false, error: "Selected brand does not exist." };
    }

    // 3. Verify vehicle fitments models
    if (validated.vehicleFitments.length > 0) {
      const modelIds = validated.vehicleFitments.map((vf) => vf.model);
      const existingModelsCount = await VehicleModel.countDocuments({
        _id: { $in: modelIds },
      });
      if (existingModelsCount !== modelIds.length) {
        return {
          success: false,
          error: "One or more vehicle models in fitment list do not exist.",
        };
      }
    }

    // 4. Validate dynamic attributes against category definitions
    const attrValidation = await validateDynamicCategoryAttributes(
      validated.category,
      validated.attributes
    );

    if (!attrValidation.valid) {
      return {
        success: false,
        error: "Please complete all required product specifications correctly.",
        fieldErrors: attrValidation.errors,
      };
    }

    // 5. Check partNumber uniqueness if provided
    const cleanPartNumber = validated.partNumber?.trim();
    if (cleanPartNumber && cleanPartNumber.length > 0) {
      const duplicatePart = await Product.findOne({
        normalizedPartNumber: cleanPartNumber.toLowerCase(),
        _id: { $ne: id },
      });
      if (duplicatePart) {
        return {
          success: false,
          error: `Another product with part number "${cleanPartNumber}" already exists (${duplicatePart.name}).`,
        };
      }
    }

    const costDecimal = mongoose.Types.Decimal128.fromString(
      validated.costPrice.toFixed(2)
    );
    const sellingDecimal = mongoose.Types.Decimal128.fromString(
      validated.sellingPrice.toFixed(2)
    );

    existingProduct.name = validated.name.trim();
    existingProduct.partNumber = cleanPartNumber || undefined;
    existingProduct.description = validated.description?.trim() || undefined;
    existingProduct.category = new mongoose.Types.ObjectId(validated.category);
    existingProduct.brand = new mongoose.Types.ObjectId(validated.brand);
    existingProduct.vehicleFitments = validated.vehicleFitments.map((vf) => ({
      model: new mongoose.Types.ObjectId(vf.model),
      yearFrom: vf.yearFrom,
      yearTo: vf.yearTo,
      notes: vf.notes?.trim() || undefined,
    }));
    existingProduct.attributes = attrValidation.sanitized;
    existingProduct.costPrice = costDecimal;
    existingProduct.sellingPrice = sellingDecimal;
    existingProduct.quantityOnHand = Math.floor(validated.quantityOnHand);
    existingProduct.reorderLevel = Math.floor(validated.reorderLevel);

    await existingProduct.save();

    safeRevalidatePath("/products");
    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/");

    return {
      success: true,
      data: { _id: String(existingProduct._id) },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update product",
    };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    const product = await Product.findById(id);
    if (!product) {
      return { success: false, error: "Product not found." };
    }

    await Product.findByIdAndDelete(id);

    safeRevalidatePath("/products");
    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete product",
    };
  }
}

/**
 * Seeds a comprehensive catalog of vehicle makes, models, categories,
 * attribute definitions, brands, and products.
 */
export async function seedProductCatalog(): Promise<ActionResult> {
  try {
    await dbConnect();

    const existingProductsCount = await Product.countDocuments();
    if (existingProductsCount > 0) {
      return {
        success: false,
        error: "Product catalog already contains data.",
      };
    }

    // 1. Vehicle Makes
    const bajaj = await VehicleMake.findOneAndUpdate(
      { normalizedName: "bajaj" },
      { name: "Bajaj", normalizedName: "bajaj" },
      { upsert: true, new: true }
    );
    const tvs = await VehicleMake.findOneAndUpdate(
      { normalizedName: "tvs" },
      { name: "TVS", normalizedName: "tvs" },
      { upsert: true, new: true }
    );
    const honda = await VehicleMake.findOneAndUpdate(
      { normalizedName: "honda" },
      { name: "Honda", normalizedName: "honda" },
      { upsert: true, new: true }
    );
    const haojue = await VehicleMake.findOneAndUpdate(
      { normalizedName: "haojue" },
      { name: "Haojue", normalizedName: "haojue" },
      { upsert: true, new: true }
    );

    // 2. Vehicle Models
    const boxer = await VehicleModel.findOneAndUpdate(
      { make: bajaj._id, normalizedName: "boxer bm150" },
      { name: "Boxer BM150", normalizedName: "boxer bm150", make: bajaj._id },
      { upsert: true, new: true }
    );
    const pulsar = await VehicleModel.findOneAndUpdate(
      { make: bajaj._id, normalizedName: "pulsar 150/180" },
      { name: "Pulsar 150/180", normalizedName: "pulsar 150/180", make: bajaj._id },
      { upsert: true, new: true }
    );
    const hlx = await VehicleModel.findOneAndUpdate(
      { make: tvs._id, normalizedName: "hlx 125/150" },
      { name: "HLX 125/150", normalizedName: "hlx 125/150", make: tvs._id },
      { upsert: true, new: true }
    );
    const cg125 = await VehicleModel.findOneAndUpdate(
      { make: honda._id, normalizedName: "cg 125" },
      { name: "CG 125", normalizedName: "cg 125", make: honda._id },
      { upsert: true, new: true }
    );
    const lucky110 = await VehicleModel.findOneAndUpdate(
      { make: haojue._id, normalizedName: "lucky 110" },
      { name: "Lucky 110", normalizedName: "lucky 110", make: haojue._id },
      { upsert: true, new: true }
    );

    // 3. Brands
    const maxxis = await Brand.findOneAndUpdate(
      { normalizedName: "maxxis" },
      { name: "Maxxis", normalizedName: "maxxis" },
      { upsert: true, new: true }
    );
    const dunlop = await Brand.findOneAndUpdate(
      { normalizedName: "dunlop" },
      { name: "Dunlop", normalizedName: "dunlop" },
      { upsert: true, new: true }
    );
    const ngk = await Brand.findOneAndUpdate(
      { normalizedName: "ngk" },
      { name: "NGK", normalizedName: "ngk" },
      { upsert: true, new: true }
    );
    const bosch = await Brand.findOneAndUpdate(
      { normalizedName: "bosch" },
      { name: "Bosch", normalizedName: "bosch" },
      { upsert: true, new: true }
    );
    const kmc = await Brand.findOneAndUpdate(
      { normalizedName: "kmc" },
      { name: "KMC", normalizedName: "kmc" },
      { upsert: true, new: true }
    );
    const exide = await Brand.findOneAndUpdate(
      { normalizedName: "exide" },
      { name: "Exide", normalizedName: "exide" },
      { upsert: true, new: true }
    );

    // 4. Categories
    const tyresCat = await Category.findOneAndUpdate(
      { normalizedName: "tyre" },
      {
        name: "Tyre",
        normalizedName: "tyre",
        description: "Motorcycle and bicycle outer tyres",
      },
      { upsert: true, new: true }
    );
    const brakePadCat = await Category.findOneAndUpdate(
      { normalizedName: "brake pad" },
      {
        name: "Brake Pad",
        normalizedName: "brake pad",
        description: "Brake shoes and disc brake pads",
      },
      { upsert: true, new: true }
    );
    const sprocketCat = await Category.findOneAndUpdate(
      { normalizedName: "sprocket" },
      {
        name: "Sprocket",
        normalizedName: "sprocket",
        description: "Front and rear drive sprockets",
      },
      { upsert: true, new: true }
    );
    const batteryCat = await Category.findOneAndUpdate(
      { normalizedName: "battery" },
      {
        name: "Battery",
        normalizedName: "battery",
        description: "Maintenance-free and lead-acid batteries",
      },
      { upsert: true, new: true }
    );

    // 5. Attribute Definitions
    // Tyre Attributes
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: tyresCat._id, key: "size" },
      {
        name: "Size",
        key: "size",
        category: tyresCat._id,
        type: "text",
        required: true,
        unit: "",
        displayOrder: 1,
      },
      { upsert: true }
    );
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: tyresCat._id, key: "position" },
      {
        name: "Position",
        key: "position",
        category: tyresCat._id,
        type: "select",
        required: true,
        options: ["Front", "Rear", "Universal"],
        displayOrder: 2,
      },
      { upsert: true }
    );
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: tyresCat._id, key: "tube_included" },
      {
        name: "Tube Included",
        key: "tube_included",
        category: tyresCat._id,
        type: "boolean",
        required: false,
        displayOrder: 3,
      },
      { upsert: true }
    );

    // Sprocket Attributes
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: sprocketCat._id, key: "teeth" },
      {
        name: "Number of Teeth",
        key: "teeth",
        category: sprocketCat._id,
        type: "number",
        required: true,
        unit: "T",
        displayOrder: 1,
      },
      { upsert: true }
    );
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: sprocketCat._id, key: "material" },
      {
        name: "Material",
        key: "material",
        category: sprocketCat._id,
        type: "select",
        required: true,
        options: ["High-Carbon Steel", "Aluminium Alloy", "Hardened Steel"],
        displayOrder: 2,
      },
      { upsert: true }
    );

    // Battery Attributes
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: batteryCat._id, key: "voltage" },
      {
        name: "Voltage",
        key: "voltage",
        category: batteryCat._id,
        type: "number",
        required: true,
        unit: "V",
        displayOrder: 1,
      },
      { upsert: true }
    );
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: batteryCat._id, key: "capacity" },
      {
        name: "Capacity",
        key: "capacity",
        category: batteryCat._id,
        type: "number",
        required: true,
        unit: "Ah",
        displayOrder: 2,
      },
      { upsert: true }
    );

    // Brake Pad Attributes
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: brakePadCat._id, key: "compound" },
      {
        name: "Compound",
        key: "compound",
        category: brakePadCat._id,
        type: "select",
        required: true,
        options: ["Semi-Metallic", "Ceramic", "Organic", "Sintered"],
        displayOrder: 1,
      },
      { upsert: true }
    );
    await ProductAttributeDefinition.findOneAndUpdate(
      { category: brakePadCat._id, key: "position" },
      {
        name: "Position",
        key: "position",
        category: brakePadCat._id,
        type: "select",
        required: true,
        options: ["Front", "Rear"],
        displayOrder: 2,
      },
      { upsert: true }
    );

    // 6. Sample Products
    await Product.create([
      {
        name: "Maxxis Heavy Duty Rear Tyre",
        partNumber: "MX-300-18-HD",
        description: "Rugged cross-ply tyre built for commercial payload use",
        category: tyresCat._id,
        brand: maxxis._id,
        vehicleFitments: [
          { model: boxer._id, notes: "Direct fitment rear wheel" },
          { model: hlx._id, notes: "Heavy load carrier" },
        ],
        attributes: {
          size: "3.00-18",
          position: "Rear",
          tube_included: true,
        },
        costPrice: mongoose.Types.Decimal128.fromString("18500.00"),
        sellingPrice: mongoose.Types.Decimal128.fromString("23000.00"),
        quantityOnHand: 24,
        reorderLevel: 6,
      },
      {
        name: "Dunlop Front Tyre Highway Gripper",
        partNumber: "DNL-275-17",
        description: "Superior wet-weather asphalt grip front tyre",
        category: tyresCat._id,
        brand: dunlop._id,
        vehicleFitments: [
          { model: boxer._id },
          { model: cg125._id },
        ],
        attributes: {
          size: "2.75-17",
          position: "Front",
          tube_included: false,
        },
        costPrice: mongoose.Types.Decimal128.fromString("14200.00"),
        sellingPrice: mongoose.Types.Decimal128.fromString("17500.00"),
        quantityOnHand: 4,
        reorderLevel: 5, // Low stock!
      },
      {
        name: "Bosch Heavy Duty Brake Shoe Set",
        partNumber: "BSH-BRK-BOX",
        description: "Asbestos-free high-friction brake shoe assembly",
        category: brakePadCat._id,
        brand: bosch._id,
        vehicleFitments: [
          { model: boxer._id },
          { model: hlx._id },
        ],
        attributes: {
          compound: "Semi-Metallic",
          position: "Rear",
        },
        costPrice: mongoose.Types.Decimal128.fromString("2200.00"),
        sellingPrice: mongoose.Types.Decimal128.fromString("3500.00"),
        quantityOnHand: 45,
        reorderLevel: 10,
      },
      {
        name: "KMC Hardened Rear Drive Sprocket 42T",
        partNumber: "KMC-SPK-42T",
        description: "High durability steel sprocket with heat-treated teeth",
        category: sprocketCat._id,
        brand: kmc._id,
        vehicleFitments: [
          { model: boxer._id },
          { model: pulsar._id },
        ],
        attributes: {
          teeth: 42,
          material: "Hardened Steel",
        },
        costPrice: mongoose.Types.Decimal128.fromString("3800.00"),
        sellingPrice: mongoose.Types.Decimal128.fromString("5500.00"),
        quantityOnHand: 0, // Out of stock!
        reorderLevel: 8,
      },
      {
        name: "Exide Maintenance-Free 12V 7Ah Battery",
        partNumber: "EXD-12V7AH-MF",
        description: "Sealed AGM battery with high cranking amps for starter motors",
        category: batteryCat._id,
        brand: exide._id,
        vehicleFitments: [
          { model: boxer._id },
          { model: pulsar._id },
          { model: hlx._id },
          { model: lucky110._id },
        ],
        attributes: {
          voltage: 12,
          capacity: 7,
        },
        costPrice: mongoose.Types.Decimal128.fromString("16000.00"),
        sellingPrice: mongoose.Types.Decimal128.fromString("21500.00"),
        quantityOnHand: 12,
        reorderLevel: 4,
      },
    ]);

    safeRevalidatePath("/products");
    safeRevalidatePath("/products/settings");
    safeRevalidatePath("/");

    return {
      success: true,
      data: "Product catalog seeded successfully!",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to seed product catalog",
    };
  }
}
