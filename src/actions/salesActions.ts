"use server";

import dbConnect from "@/lib/dbConnect";
import {
  Sale,
  Product,
  Customer,
  CustomerPayment,
  Balance,
  ISale,
  ISaleItem,
} from "@/models";
import {
  createProductSaleSchema,
  cancelSaleSchema,
  CreateProductSaleInput,
  CancelSaleInput,
} from "@/lib/validations/sale";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import crypto from "crypto";
import mongoose from "mongoose";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateSaleInput {
  bicycle: number;
  motorcycle: number;
  totalAmount?: number;
  notes?: string;
  saleDate?: string | Date;
}

export async function generateSaleNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SALE-${y}${m}${d}-${rand}`;
}

export async function generateCustomerPaymentNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CPAY-${y}${m}${d}-${rand}`;
}

export interface SaleViewItem {
  _id: string;
  saleNumber: string;
  saleDate: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  isWalkIn: boolean;
  itemCount: number;
  items: Array<{
    product: string;
    productName: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentStatus: "paid" | "partial" | "unpaid";
  status: "confirmed" | "cancelled";
  isLegacy: boolean;
  notes?: string;
  createdAt: string;
}

export interface SalesListResponse {
  items: SaleViewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    totalRevenue: number;
    totalPaid: number;
    totalOutstandingDebt: number;
    confirmedSalesCount: number;
  };
}

export async function getSales(
  params: {
    search?: string;
    customerId?: string;
    paymentStatus?: string;
    status?: string;
    page?: number;
    limit?: number;
  } | number = {}
): Promise<any> {
  await dbConnect();

  // Backward compatibility: if params is a number (limit), return lean array
  if (typeof params === "number") {
    const sales = await Sale.find()
      .sort({ saleDate: -1, createdAt: -1 })
      .limit(params)
      .lean();
    return JSON.parse(JSON.stringify(sales));
  }

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {};

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    query.$or = [
      { saleNumber: { $regex: q, $options: "i" } },
      { customerName: { $regex: q, $options: "i" } },
      { customerPhone: { $regex: q, $options: "i" } },
      { "items.productName": { $regex: q, $options: "i" } },
      { "items.partNumber": { $regex: q, $options: "i" } },
      { notes: { $regex: q, $options: "i" } },
    ];
  }

  if (params.customerId && mongoose.Types.ObjectId.isValid(params.customerId)) {
    query.customerId = new mongoose.Types.ObjectId(params.customerId);
  }

  if (params.paymentStatus && params.paymentStatus !== "all") {
    query.paymentStatus = params.paymentStatus;
  }

  if (params.status && params.status !== "all") {
    query.status = params.status;
  }

  const [rawSales, totalCount, metricsAgg] = await Promise.all([
    Sale.find(query).sort({ saleDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Sale.countDocuments(query),
    Sale.aggregate([
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDebt: { $sum: "$balance" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const items: SaleViewItem[] = rawSales.map((s: any) => ({
    _id: String(s._id),
    saleNumber: s.saleNumber || (s.isLegacy ? `LEGACY-${String(s._id).slice(-6)}` : `SALE-${String(s._id).slice(-6)}`),
    saleDate: s.saleDate ? new Date(s.saleDate).toISOString() : new Date(s.createdAt).toISOString(),
    customerId: s.customerId ? String(s.customerId) : undefined,
    customerName: s.customerName || (s.isWalkIn ? "Walk-in Customer" : s.isLegacy ? "Legacy Counter Sale" : undefined),
    customerPhone: s.customerPhone,
    isWalkIn: s.isWalkIn ?? false,
    itemCount: s.items ? s.items.length : 0,
    items: (s.items || []).map((it: any) => ({
      product: String(it.product),
      productName: it.productName,
      partNumber: it.partNumber,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      unitCost: it.unitCost || 0,
      lineTotal: it.lineTotal,
    })),
    subtotal: s.subtotal || s.totalAmount || 0,
    discount: s.discount || 0,
    totalAmount: s.totalAmount || 0,
    paidAmount: s.paidAmount !== undefined ? s.paidAmount : s.totalAmount || 0,
    balance: s.balance !== undefined ? s.balance : 0,
    paymentStatus: s.paymentStatus || "paid",
    status: s.status || "confirmed",
    isLegacy: s.isLegacy ?? false,
    notes: s.notes,
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : "",
  }));

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const metrics = metricsAgg[0] || {
    totalRevenue: 0,
    totalPaid: 0,
    totalDebt: 0,
    count: 0,
  };

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
    },
    metrics: {
      totalRevenue: metrics.totalRevenue,
      totalPaid: metrics.totalPaid,
      totalOutstandingDebt: metrics.totalDebt,
      confirmedSalesCount: metrics.count,
    },
  };
}

export async function getSaleById(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid sale ID." };
    }

    const sale = await Sale.findById(id).lean();
    if (!sale) {
      return { success: false, error: "Sale not found." };
    }

    // Find all payments that allocated to this sale
    const payments = await CustomerPayment.find({
      "allocations.saleId": new mongoose.Types.ObjectId(id),
      status: "active",
    })
      .sort({ paymentDate: -1 })
      .lean();

    return {
      success: true,
      data: {
        sale: JSON.parse(JSON.stringify(sale)),
        payments: JSON.parse(JSON.stringify(payments)),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch sale details.",
    };
  }
}

export async function createProductSale(
  rawInput: CreateProductSaleInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createProductSaleSchema.parse(rawInput);

    // 1. Verify customer
    let customerDoc = null;
    let customerName = validated.customerName?.trim();
    let customerPhone = validated.customerPhone?.trim();

    if (!validated.isWalkIn) {
      if (!validated.customerId) {
        return {
          success: false,
          error: "A registered customer is required for non-walk-in sales.",
        };
      }
      customerDoc = await Customer.findById(validated.customerId);
      if (!customerDoc) {
        return { success: false, error: "Selected customer does not exist." };
      }
      if (!customerDoc.isActive) {
        return {
          success: false,
          error: "Selected customer is deactivated. Activate customer first.",
        };
      }
      customerName = customerDoc.name;
      customerPhone = customerDoc.phone;
    } else {
      customerName = customerName || "Walk-in Customer";
    }

    // 2. Validate products and fetch records
    const productIds = validated.items.map((it) => it.product);
    const uniqueIds = Array.from(new Set(productIds));
    const products = await Product.find({ _id: { $in: uniqueIds } });

    if (products.length !== uniqueIds.length) {
      return {
        success: false,
        error: "One or more selected products do not exist in the catalogue.",
      };
    }

    const productMap = new Map<string, any>();
    products.forEach((p) => productMap.set(String(p._id), p));

    // Consolidate quantities if duplicate products entered
    const itemQuantities = new Map<string, number>();
    for (const item of validated.items) {
      const current = itemQuantities.get(item.product) || 0;
      itemQuantities.set(item.product, current + item.quantity);
    }

    // Check stock availability
    for (const [prodId, totalRequestedQty] of itemQuantities.entries()) {
      const prod = productMap.get(prodId);
      if (prod.quantityOnHand < totalRequestedQty) {
        return {
          success: false,
          error: `Insufficient stock for "${prod.name}". In stock: ${prod.quantityOnHand}, Requested: ${totalRequestedQty}.`,
        };
      }
    }

    // Build line items with snapshots
    let subtotal = 0;
    const saleItems: ISaleItem[] = [];

    for (const item of validated.items) {
      const prod = productMap.get(item.product);
      const unitPrice = Math.round(Number(item.unitPrice) * 100) / 100;
      const lineTotal = Math.round(item.quantity * unitPrice * 100) / 100;

      // Extract current unit cost snapshot (handling Decimal128 or number)
      let unitCost = 0;
      if (prod.costPrice) {
        unitCost = typeof prod.costPrice === "object" && "toString" in prod.costPrice
          ? Number(prod.costPrice.toString())
          : Number(prod.costPrice);
      }

      subtotal += lineTotal;

      saleItems.push({
        product: prod._id,
        productName: prod.name,
        partNumber: prod.partNumber,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        lineTotal,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const discount = Math.round(Math.min(subtotal, Math.max(0, validated.discount || 0)) * 100) / 100;
    const totalAmount = Math.round(Math.max(0, subtotal - discount) * 100) / 100;
    const initialPayment = Math.round(Math.min(totalAmount, Math.max(0, validated.initialPayment || 0)) * 100) / 100;
    const balance = Math.round((totalAmount - initialPayment) * 100) / 100;

    // Rule: Walk-in customers cannot have credit sales
    if (validated.isWalkIn && balance > 0) {
      return {
        success: false,
        error: "Credit or partial-payment sales require selecting a registered customer to track outstanding debt.",
      };
    }

    let paymentStatus: "paid" | "partial" | "unpaid" = "paid";
    if (balance === 0) {
      paymentStatus = "paid";
    } else if (initialPayment > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "unpaid";
    }

    // 3. Atomically decrement inventory with rollback protection
    const deductedProducts: Array<{ id: string; qty: number }> = [];

    for (const [prodId, totalRequestedQty] of itemQuantities.entries()) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: prodId, quantityOnHand: { $gte: totalRequestedQty } },
        { $inc: { quantityOnHand: -totalRequestedQty } },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback already deducted products
        for (const rolled of deductedProducts) {
          await Product.updateOne(
            { _id: rolled.id },
            { $inc: { quantityOnHand: rolled.qty } }
          );
        }
        const prod = productMap.get(prodId);
        return {
          success: false,
          error: `Inventory conflict: Insufficient stock for "${prod.name}". Please refresh and try again.`,
        };
      }

      deductedProducts.push({ id: prodId, qty: totalRequestedQty });
    }

    // 4. Create Sale document
    const saleNumber = await generateSaleNumber();
    const saleDate = validated.saleDate ? new Date(validated.saleDate) : new Date();

    const sale = await Sale.create({
      saleNumber,
      customerId: customerDoc ? customerDoc._id : undefined,
      customerName,
      customerPhone,
      isWalkIn: validated.isWalkIn,
      items: saleItems,
      subtotal,
      discount,
      totalAmount,
      paidAmount: initialPayment,
      balance,
      paymentStatus,
      status: "confirmed",
      notes: validated.notes?.trim() || undefined,
      saleDate,
      isLegacy: false,
    });

    // 5. Handle payments and balance updates
    if (initialPayment > 0) {
      const paymentNumber = await generateCustomerPaymentNumber();
      await CustomerPayment.create({
        paymentNumber,
        customerId: customerDoc ? customerDoc._id : undefined,
        customerName,
        amount: initialPayment,
        paymentDate: saleDate,
        paymentMethod: validated.paymentMethod || "cash",
        reference: validated.paymentReference?.trim() || undefined,
        notes: `Initial payment on sale ${saleNumber}`,
        allocations: [
          {
            saleId: sale._id,
            saleNumber: sale.saleNumber,
            amount: initialPayment,
          },
        ],
        status: "active",
      });

      // Increment availableBalance by actual cash received, and customerDebt by outstanding balance
      await Balance.findOneAndUpdate(
        {},
        {
          $inc: {
            availableBalance: initialPayment,
            customerDebt: balance,
          },
        },
        { upsert: true, new: true }
      );
    } else if (balance > 0) {
      // Unpaid credit sale: available cash does not change, but customerDebt increases
      await Balance.findOneAndUpdate(
        {},
        {
          $inc: {
            customerDebt: balance,
          },
        },
        { upsert: true, new: true }
      );
    }

    safeRevalidatePath("/sales");
    safeRevalidatePath("/customers");
    safeRevalidatePath("/products");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(sale)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create sale.",
    };
  }
}

export async function cancelSale(
  saleId: string,
  rawInput: CancelSaleInput
): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(saleId)) {
      return { success: false, error: "Invalid sale ID." };
    }

    const validated = cancelSaleSchema.parse(rawInput);
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return { success: false, error: "Sale not found." };
    }

    if (sale.status === "cancelled") {
      return { success: false, error: "Sale is already cancelled." };
    }

    if (sale.isLegacy) {
      return {
        success: false,
        error: "Legacy aggregate sales cannot be cancelled via this workflow.",
      };
    }

    // 1. Restore product inventory
    for (const item of sale.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { quantityOnHand: item.quantity } }
      );
    }

    // 2. Reverse associated customer payments
    const payments = await CustomerPayment.find({
      "allocations.saleId": sale._id,
      status: "active",
    });

    let totalPaymentsReversed = 0;
    for (const pay of payments) {
      // If payment is purely for this sale, reverse it
      pay.status = "reversed";
      pay.reversedAt = new Date();
      pay.reversalReason = `Sale ${sale.saleNumber} was cancelled: ${validated.reason || "Cancelled"}`;
      await pay.save();
      totalPaymentsReversed += pay.amount;
    }

    // 3. Reconcile Balance
    // Deduct reversed cash from availableBalance, and remove customer debt
    await Balance.findOneAndUpdate(
      {},
      {
        $inc: {
          availableBalance: -sale.paidAmount,
          customerDebt: -sale.balance,
        },
      },
      { upsert: true, new: true }
    );

    // 4. Update Sale status
    sale.status = "cancelled";
    sale.cancelledAt = new Date();
    sale.cancellationReason = validated.reason || undefined;
    await sale.save();

    safeRevalidatePath("/sales");
    safeRevalidatePath("/customers");
    safeRevalidatePath("/products");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(sale)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to cancel sale.",
    };
  }
}

/**
 * Legacy Sale Creation
 * Preserved for historical compatibility
 */
export async function createSale(data: CreateSaleInput) {
  await dbConnect();

  const bicycle = Number(data.bicycle) || 0;
  const motorcycle = Number(data.motorcycle) || 0;
  const totalAmount =
    data.totalAmount !== undefined && data.totalAmount !== null
      ? Number(data.totalAmount)
      : bicycle + motorcycle;

  const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();

  const newSale = await Sale.create({
    bicycle,
    motorcycle,
    totalAmount,
    paidAmount: totalAmount,
    balance: 0,
    paymentStatus: "paid",
    status: "confirmed",
    isLegacy: true,
    notes: data.notes || "",
    saleDate,
  });

  // Update Available Balance for legacy sale
  await Balance.findOneAndUpdate(
    {},
    { $inc: { availableBalance: totalAmount } },
    { upsert: true, new: true }
  );

  safeRevalidatePath("/");
  safeRevalidatePath("/sales");
  safeRevalidatePath("/transactions");

  return JSON.parse(JSON.stringify(newSale));
}
