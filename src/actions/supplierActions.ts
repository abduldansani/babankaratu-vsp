"use server";

import dbConnect from "@/lib/dbConnect";
import { Supplier, Purchase, SupplierPayment } from "@/models";
import {
  createSupplierSchema,
  updateSupplierSchema,
  CreateSupplierInput,
  UpdateSupplierInput,
} from "@/lib/validations/supplier";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import mongoose from "mongoose";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SupplierViewItem {
  _id: string;
  name: string;
  normalizedName: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  purchasesCount: number;
  totalPurchasedAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListResponse {
  items: SupplierViewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalOutstandingDebt: number;
  };
}

export async function getSuppliers(params: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
} = {}): Promise<SupplierListResponse> {
  await dbConnect();

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {};

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    query.$or = [
      { name: { $regex: q, $options: "i" } },
      { contactPerson: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  if (params.isActive !== undefined) {
    query.isActive = params.isActive;
  }

  const [rawSuppliers, totalCount, allSuppliers] = await Promise.all([
    Supplier.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(query),
    Supplier.find({}, "_id isActive").lean(),
  ]);

  // Derive balances from posted purchases & payments
  const supplierIds = rawSuppliers.map((s) => s._id);

  const [purchaseAgg, paymentAgg] = await Promise.all([
    Purchase.aggregate([
      {
        $match: {
          supplierId: { $in: supplierIds },
          status: "posted",
        },
      },
      {
        $group: {
          _id: "$supplierId",
          count: { $sum: 1 },
          totalPurchased: { $sum: "$total" },
          totalPaidOnPurchases: { $sum: "$paid" },
          totalBalanceOnPurchases: { $sum: "$balance" },
        },
      },
    ]),
    SupplierPayment.aggregate([
      {
        $match: {
          supplier: { $in: supplierIds },
          status: "active",
        },
      },
      {
        $group: {
          _id: "$supplier",
          totalPaid: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const purchaseMap = new Map<string, any>();
  for (const p of purchaseAgg) {
    purchaseMap.set(String(p._id), p);
  }

  const paymentMap = new Map<string, number>();
  for (const pay of paymentAgg) {
    paymentMap.set(String(pay._id), pay.totalPaid);
  }

  const items: SupplierViewItem[] = rawSuppliers.map((s) => {
    const pData = purchaseMap.get(String(s._id));
    const totalPurchased = pData?.totalPurchased || 0;
    // Calculate derived outstanding balance:
    // Outstanding balance = total posted obligations - total payments allocated
    const balance = pData ? Math.max(0, pData.totalBalanceOnPurchases || 0) : 0;
    const totalPaid = pData ? pData.totalPaidOnPurchases || 0 : (paymentMap.get(String(s._id)) || 0);

    return {
      _id: String(s._id),
      name: s.name,
      normalizedName: s.normalizedName,
      phone: s.phone || "",
      email: s.email || "",
      contactPerson: s.contactPerson || "",
      address: s.address || "",
      notes: s.notes || "",
      isActive: s.isActive ?? true,
      purchasesCount: pData?.count || 0,
      totalPurchasedAmount: totalPurchased,
      totalPaidAmount: totalPaid,
      outstandingBalance: balance,
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : "",
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : "",
    };
  });

  // Calculate overall metrics
  const totalPurchasesAllAgg = await Purchase.aggregate([
    { $match: { status: "posted" } },
    { $group: { _id: null, totalBalance: { $sum: "$balance" } } },
  ]);

  const activeCount = allSuppliers.filter((s) => s.isActive !== false).length;
  const totalOutstandingDebt = totalPurchasesAllAgg[0]?.totalBalance || 0;

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
    metrics: {
      totalSuppliers: allSuppliers.length,
      activeSuppliers: activeCount,
      totalOutstandingDebt,
    },
  };
}

export async function getSupplierById(id: string) {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const supplier = await Supplier.findById(id).lean();
  if (!supplier) return null;

  const [purchases, payments] = await Promise.all([
    Purchase.find({ supplierId: id })
      .sort({ purchaseDate: -1, createdAt: -1 })
      .lean(),
    SupplierPayment.find({ supplier: id })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean(),
  ]);

  // Derived financials
  let totalPurchased = 0;
  let totalPaid = 0;
  let outstandingBalance = 0;

  for (const p of purchases) {
    if (p.status === "posted") {
      totalPurchased += p.total || 0;
      totalPaid += p.paid || 0;
      outstandingBalance += p.balance || 0;
    }
  }

  return {
    supplier: {
      _id: String(supplier._id),
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      contactPerson: supplier.contactPerson || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      isActive: supplier.isActive ?? true,
      createdAt: supplier.createdAt ? new Date(supplier.createdAt).toISOString() : "",
      updatedAt: supplier.updatedAt ? new Date(supplier.updatedAt).toISOString() : "",
    },
    metrics: {
      totalPurchased,
      totalPaid,
      outstandingBalance,
      purchasesCount: purchases.length,
      paymentsCount: payments.length,
    },
    purchases: JSON.parse(JSON.stringify(purchases)),
    payments: JSON.parse(JSON.stringify(payments)),
  };
}

export async function createSupplier(
  rawInput: CreateSupplierInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createSupplierSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const existing = await Supplier.findOne({ normalizedName });
    if (existing) {
      return {
        success: false,
        error: `A supplier named "${validated.name}" already exists.`,
      };
    }

    const supplier = await Supplier.create({
      name: validated.name.trim(),
      normalizedName,
      phone: validated.phone?.trim() || undefined,
      email: validated.email?.trim() || undefined,
      contactPerson: validated.contactPerson?.trim() || undefined,
      address: validated.address?.trim() || undefined,
      notes: validated.notes?.trim() || undefined,
      isActive: validated.isActive ?? true,
    });

    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/purchases");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(supplier)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create supplier",
    };
  }
}

export async function updateSupplier(
  id: string,
  rawInput: UpdateSupplierInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = updateSupplierSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();

    const duplicate = await Supplier.findOne({
      normalizedName,
      _id: { $ne: id },
    });
    if (duplicate) {
      return {
        success: false,
        error: `Another supplier named "${validated.name}" already exists.`,
      };
    }

    const updated = await Supplier.findByIdAndUpdate(
      id,
      {
        name: validated.name.trim(),
        normalizedName,
        phone: validated.phone?.trim() || undefined,
        email: validated.email?.trim() || undefined,
        contactPerson: validated.contactPerson?.trim() || undefined,
        address: validated.address?.trim() || undefined,
        notes: validated.notes?.trim() || undefined,
        isActive: validated.isActive ?? true,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return { success: false, error: "Supplier not found." };
    }

    // Also update cached supplierName on purchases if name changed
    await Purchase.updateMany(
      { supplierId: id },
      { $set: { supplier: updated.name, supplierName: updated.name } }
    );

    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/purchases");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update supplier",
    };
  }
}

export async function deleteOrDeactivateSupplier(
  id: string
): Promise<ActionResult<{ action: "deleted" | "deactivated" }>> {
  try {
    await dbConnect();

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return { success: false, error: "Supplier not found." };
    }

    const [purchasesCount, paymentsCount] = await Promise.all([
      Purchase.countDocuments({
        $or: [{ supplierId: id }, { supplier: supplier.name }],
      }),
      SupplierPayment.countDocuments({ supplier: id }),
    ]);

    // If historical references exist, preserve records and deactivate instead!
    if (purchasesCount > 0 || paymentsCount > 0) {
      supplier.isActive = false;
      await supplier.save();

      safeRevalidatePath("/suppliers");
      safeRevalidatePath("/purchases");

      return {
        success: true,
        data: { action: "deactivated" },
        error: `Supplier "${supplier.name}" has ${purchasesCount} purchase(s) and ${paymentsCount} payment(s) on record. It has been safely deactivated to preserve historical accounting integrity.`,
      };
    }

    // No dependencies: safe to hard delete
    await Supplier.findByIdAndDelete(id);

    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/purchases");

    return {
      success: true,
      data: { action: "deleted" },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to remove supplier",
    };
  }
}

export async function seedSampleSuppliers(): Promise<ActionResult> {
  try {
    await dbConnect();

    const count = await Supplier.countDocuments();
    if (count > 0) {
      return { success: false, error: "Suppliers already exist in database." };
    }

    await Supplier.create([
      {
        name: "Kano Auto Parts Ltd",
        normalizedName: "kano auto parts ltd",
        phone: "+234 803 123 4567",
        email: "sales@kanoautoparts.ng",
        contactPerson: "Alhaji Musa Ibrahim",
        address: "Kano Central Market, Line 4, Kano",
        notes: "Major distributor of motorcycle engine kits, pistons, and chains",
        isActive: true,
      },
      {
        name: "Kaduna Wholesale Parts",
        normalizedName: "kaduna wholesale parts",
        phone: "+234 802 987 6543",
        email: "orders@kadunawholesale.com",
        contactPerson: "Mallam Garba Sani",
        address: "Ahmadu Bello Way, Kaduna",
        notes: "Bicycle parts, rims, tubes, and ball bearings importer",
        isActive: true,
      },
      {
        name: "Lagos Central Bearings & Electricals",
        normalizedName: "lagos central bearings & electricals",
        phone: "+234 805 555 7890",
        email: "lagosparts@vspng.com",
        contactPerson: "Chief Emeka Okafor",
        address: "Idumota Auto Plaza, Lagos Island",
        notes: "Direct importer of Bosch, NGK spark plugs, and Exide batteries",
        isActive: true,
      },
    ]);

    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/purchases");

    return { success: true, data: "Sample suppliers created successfully!" };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to seed suppliers",
    };
  }
}
