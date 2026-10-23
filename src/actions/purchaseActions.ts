"use server";

import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import {
  Purchase,
  Supplier,
  Product,
  Balance,
  SupplierPayment,
  OutstandingPayment,
} from "@/models";
import {
  createPurchaseSchema,
  updateDraftPurchaseSchema,
  updatePurchaseSchema,
  postPurchaseSchema,
  cancelPurchaseSchema,
  CreatePurchaseInput,
  UpdateDraftPurchaseInput,
  UpdatePurchaseInput,
  PostPurchaseInput,
  CancelPurchaseInput,
} from "@/lib/validations/purchase";
import { calculateWeightedAverageCost } from "@/lib/calculations/costing";
import { generatePaymentNumber } from "./supplierPaymentActions";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import { formatCurrency } from "@/utils/formatCurrency";
import crypto from "crypto";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function generatePurchaseNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PUR-${y}${m}${d}-${rand}`;
}

export interface PurchaseQueryParams {
  search?: string;
  supplierId?: string;
  status?: "all" | "draft" | "posted" | "cancelled";
  paymentStatus?: "all" | "unpaid" | "partial" | "paid";
  page?: number;
  limit?: number;
}

export interface PurchaseListItem {
  _id: string;
  purchaseNumber: string;
  supplierId?: string;
  supplierName: string;
  purchaseDate: string;
  status: "draft" | "posted" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  itemsCount: number;
  subtotal: number;
  transport: number;
  total: number;
  paid: number;
  balance: number;
  notes?: string;
  createdAt: string;
}

export interface PurchaseListResponse {
  items: PurchaseListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    draftsCount: number;
  };
}

export async function getPurchases(
  params: PurchaseQueryParams = {}
): Promise<PurchaseListResponse> {
  await dbConnect();

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    filter.$or = [
      { purchaseNumber: { $regex: q, $options: "i" } },
      { supplier: { $regex: q, $options: "i" } },
      { supplierName: { $regex: q, $options: "i" } },
      { notes: { $regex: q, $options: "i" } },
      { "items.productName": { $regex: q, $options: "i" } },
      { "items.partNumber": { $regex: q, $options: "i" } },
    ];
  }

  if (params.supplierId && params.supplierId !== "all") {
    filter.supplierId = params.supplierId;
  }

  if (params.status && params.status !== "all") {
    filter.status = params.status;
  }

  if (params.paymentStatus && params.paymentStatus !== "all") {
    filter.paymentStatus = params.paymentStatus;
  }

  const [rawPurchases, totalCount, allPurchasesSummary] = await Promise.all([
    Purchase.find(filter)
      .populate("supplierId", "name contactPerson phone")
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Purchase.countDocuments(filter),
    Purchase.find({}, "status paymentStatus total paid balance").lean(),
  ]);

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let draftsCount = 0;

  for (const p of allPurchasesSummary) {
    if (p.status === "posted") {
      totalInvoiced += p.total || 0;
      totalPaid += p.paid || 0;
      totalOutstanding += p.balance || 0;
    } else if (p.status === "draft") {
      draftsCount++;
    }
  }

  const items: PurchaseListItem[] = rawPurchases.map((p: any) => {
    const supplierDisplayName =
      p.supplierId?.name || p.supplierName || p.supplier || "Supplier";
    return {
      _id: String(p._id),
      purchaseNumber: p.purchaseNumber || `LEGACY-${String(p._id).slice(-6).toUpperCase()}`,
      supplierId: p.supplierId?._id ? String(p.supplierId._id) : undefined,
      supplierName: supplierDisplayName,
      purchaseDate: p.purchaseDate
        ? new Date(p.purchaseDate).toISOString()
        : new Date(p.createdAt).toISOString(),
      status: (p.status as any) || "posted",
      paymentStatus: (p.paymentStatus as any) || (p.balance <= 0 ? "paid" : p.paid > 0 ? "partial" : "unpaid"),
      itemsCount: Array.isArray(p.items) ? p.items.length : 0,
      subtotal: p.subtotal || Math.max(0, (p.total || 0) - (p.transport || 0)),
      transport: p.transport || 0,
      total: p.total || 0,
      paid: p.paid || 0,
      balance: p.balance !== undefined ? p.balance : Math.max(0, (p.total || 0) - (p.paid || 0)),
      notes: p.notes || "",
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
    metrics: {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      draftsCount,
    },
  };
}

export async function getPurchaseById(id: string) {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const purchase = await Purchase.findById(id)
    .populate("supplierId", "name contactPerson phone email address")
    .populate("items.product", "name partNumber quantityOnHand costPrice sellingPrice")
    .lean();

  if (!purchase) return null;

  const payments = await SupplierPayment.find({
    purchase: purchase._id,
    status: "active",
  })
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean();

  return {
    ...JSON.parse(JSON.stringify(purchase)),
    payments: JSON.parse(JSON.stringify(payments)),
  };
}

export async function createPurchase(
  rawInput: CreatePurchaseInput
): Promise<ActionResult<{ _id: string; purchaseNumber: string }>> {
  try {
    await dbConnect();
    const validated = createPurchaseSchema.parse(rawInput);

    // 1. Verify supplier exists
    const supplier = await Supplier.findById(validated.supplierId);
    if (!supplier) {
      return { success: false, error: "Selected supplier does not exist." };
    }

    // 2. Verify all products exist and calculate line totals
    const productIds = validated.items.map((i) => i.product);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map<string, any>();
    for (const p of existingProducts) {
      productMap.set(String(p._id), p);
    }

    if (existingProducts.length !== productIds.length) {
      return {
        success: false,
        error: "One or more spare parts selected in the purchase line items do not exist.",
      };
    }

    let subtotal = 0;
    const resolvedItems = validated.items.map((item) => {
      const prod = productMap.get(item.product);
      const qty = Math.floor(item.quantity);
      const unitCost = Number(item.unitCost.toFixed(2));
      const lineTotal = Number((qty * unitCost).toFixed(2));
      subtotal += lineTotal;

      return {
        product: prod._id,
        productName: prod.name,
        partNumber: prod.partNumber || undefined,
        quantity: qty,
        unitCost,
        lineTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    const transport = Number(validated.transport.toFixed(2));
    const total = Number((subtotal + transport).toFixed(2));

    const isPosted = validated.status === "posted";
    const initialPayment = Math.min(total, Number(validated.initialPayment.toFixed(2)));
    const balance = isPosted ? Math.max(0, Number((total - initialPayment).toFixed(2))) : total;
    const paymentStatus =
      initialPayment >= total
        ? "paid"
        : initialPayment > 0
        ? "partial"
        : "unpaid";

    const purchaseNumber = await generatePurchaseNumber();
    const purchaseDate = validated.purchaseDate
      ? new Date(validated.purchaseDate)
      : new Date();

    const purchase = new Purchase({
      purchaseNumber,
      supplierId: supplier._id,
      supplier: supplier.name,
      supplierName: supplier.name,
      purchaseDate,
      status: validated.status,
      paymentStatus: isPosted ? paymentStatus : "unpaid",
      items: resolvedItems,
      subtotal,
      transport,
      total,
      paid: isPosted ? initialPayment : 0,
      balance: isPosted ? balance : total,
      notes: validated.notes?.trim() || undefined,
      postedAt: isPosted ? new Date() : undefined,
    });

    // 3. If saving directly as POSTED: update stock & costing!
    if (isPosted) {
      for (const item of resolvedItems) {
        const prod = productMap.get(String(item.product));
        const currentStock = prod.quantityOnHand || 0;
        const currentCost = prod.costPrice
          ? parseFloat(prod.costPrice.toString())
          : 0;

        const { newStock, newAverageCost } = calculateWeightedAverageCost(
          currentStock,
          currentCost,
          item.quantity,
          item.unitCost
        );

        prod.quantityOnHand = newStock;
        prod.costPrice = mongoose.Types.Decimal128.fromString(
          newAverageCost.toFixed(2)
        );
        await prod.save();
      }

      // Record Initial Payment if provided
      if (initialPayment > 0) {
        const paymentNumber = await generatePaymentNumber();
        await SupplierPayment.create({
          paymentNumber,
          supplier: supplier._id,
          purchase: purchase._id,
          amount: initialPayment,
          paymentDate: purchaseDate,
          paymentMethod: validated.paymentMethod,
          reference: validated.paymentReference || undefined,
          notes: `Initial payment on purchase ${purchaseNumber}`,
          status: "active",
        });

        // Record legacy OutstandingPayment
        await OutstandingPayment.create({
          amount: initialPayment,
          recipient: supplier.name,
          purchaseId: purchase._id,
          notes: `Initial purchase settlement - ${purchaseNumber}`,
          paidAt: purchaseDate,
        });
      }

      // Update global Balance
      // Cash out = initial payment + transport
      const cashOut = initialPayment + transport;
      await Balance.findOneAndUpdate(
        {},
        {
          $inc: {
            availableBalance: -cashOut,
            totalOutstanding: balance,
          },
        },
        { upsert: true, new: true }
      );
    }

    await purchase.save();

    safeRevalidatePath("/purchases");
    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/products");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/");

    return {
      success: true,
      data: {
        _id: String(purchase._id),
        purchaseNumber,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create purchase",
    };
  }
}

export async function updatePurchase(
  id: string,
  rawInput: UpdatePurchaseInput
): Promise<ActionResult<{ _id: string; purchaseNumber: string }>> {
  try {
    await dbConnect();
    const validated = updatePurchaseSchema.parse(rawInput);

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return { success: false, error: "Purchase record not found." };
    }

    if (purchase.status === "cancelled") {
      return {
        success: false,
        error:
          "Cancelled purchases are void and cannot be edited. Please create a new purchase order instead.",
      };
    }

    // 1. Verify supplier exists
    const supplier = await Supplier.findById(validated.supplierId);
    if (!supplier) {
      return { success: false, error: "Selected supplier does not exist." };
    }

    // 2. Verify all products exist in line items
    const productIds = validated.items.map((i) => i.product);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map<string, any>();
    for (const p of existingProducts) {
      productMap.set(String(p._id), p);
    }

    if (existingProducts.length !== productIds.length) {
      return {
        success: false,
        error:
          "One or more spare parts selected in the purchase line items do not exist.",
      };
    }

    // 3. Resolve line items
    let subtotal = 0;
    const resolvedItems = validated.items.map((item) => {
      const prod = productMap.get(item.product);
      const qty = Math.floor(item.quantity);
      const unitCost = Number(item.unitCost.toFixed(2));
      const lineTotal = Number((qty * unitCost).toFixed(2));
      subtotal += lineTotal;

      return {
        product: prod._id,
        productName: prod.name,
        partNumber: prod.partNumber || undefined,
        quantity: qty,
        unitCost,
        lineTotal,
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    const transport = Number(validated.transport.toFixed(2));
    const total = Number((subtotal + transport).toFixed(2));
    const purchaseDate = validated.purchaseDate
      ? new Date(validated.purchaseDate)
      : purchase.purchaseDate;

    // ==========================================
    // CASE A: Purchase is currently a DRAFT
    // ==========================================
    if (purchase.status === "draft") {
      if (validated.postImmediately) {
        // Apply stock and weighted average costing
        for (const item of resolvedItems) {
          const prod = productMap.get(String(item.product));
          const currentStock = prod.quantityOnHand || 0;
          const currentCost = prod.costPrice
            ? parseFloat(prod.costPrice.toString())
            : 0;

          const { newStock, newAverageCost } = calculateWeightedAverageCost(
            currentStock,
            currentCost,
            item.quantity,
            item.unitCost
          );

          prod.quantityOnHand = newStock;
          prod.costPrice = mongoose.Types.Decimal128.fromString(
            newAverageCost.toFixed(2)
          );
          await prod.save();
        }

        // Update Balance: Transport cash outlay and total debt
        await Balance.findOneAndUpdate(
          {},
          {
            $inc: {
              availableBalance: -transport,
              totalOutstanding: total,
            },
          },
          { upsert: true, new: true }
        );

        purchase.status = "posted";
        purchase.postedAt = new Date();
        purchase.paid = 0;
        purchase.balance = total;
        purchase.paymentStatus = "unpaid";
      } else {
        purchase.balance = total;
      }

      purchase.supplierId = supplier._id;
      purchase.supplier = supplier.name;
      purchase.supplierName = supplier.name;
      purchase.purchaseDate = purchaseDate;
      purchase.items = resolvedItems as any;
      purchase.subtotal = subtotal;
      purchase.transport = transport;
      purchase.total = total;
      purchase.notes = validated.notes?.trim() || undefined;

      await purchase.save();

      safeRevalidatePath("/purchases");
      safeRevalidatePath(`/purchases/${id}`);
      safeRevalidatePath("/suppliers");
      safeRevalidatePath("/products");
      safeRevalidatePath("/transactions");
      safeRevalidatePath("/");

      return {
        success: true,
        data: {
          _id: String(purchase._id),
          purchaseNumber: purchase.purchaseNumber || String(purchase._id),
        },
      };
    }

    // ==========================================
    // CASE B: Purchase is currently POSTED
    // ==========================================
    // Check payment constraint: New total cannot be less than already remitted payments
    const alreadyPaid = Number(purchase.paid || 0);
    if (total < alreadyPaid) {
      return {
        success: false,
        error: `New invoice total (${formatCurrency(
          total
        )}) cannot be less than the amount already paid (${formatCurrency(
          alreadyPaid
        )}). If a refund was received, please record it before reducing invoice totals.`,
      };
    }

    // Build old items map (productId -> quantity, unitCost)
    const oldItemsMap = new Map<
      string,
      { quantity: number; unitCost: number }
    >();
    for (const item of purchase.items) {
      const pid = String(item.product);
      const prev = oldItemsMap.get(pid);
      if (prev) {
        prev.quantity += item.quantity;
      } else {
        oldItemsMap.set(pid, {
          quantity: item.quantity,
          unitCost: item.unitCost,
        });
      }
    }

    // Build new items map (productId -> quantity, unitCost)
    const newItemsMap = new Map<
      string,
      { quantity: number; unitCost: number }
    >();
    for (const item of resolvedItems) {
      const pid = String(item.product);
      const prev = newItemsMap.get(pid);
      if (prev) {
        prev.quantity += item.quantity;
      } else {
        newItemsMap.set(pid, {
          quantity: item.quantity,
          unitCost: item.unitCost,
        });
      }
    }

    // Collect all affected products
    const allAffectedIds = Array.from(
      new Set([...oldItemsMap.keys(), ...newItemsMap.keys()])
    );
    const affectedProducts = await Product.find({
      _id: { $in: allAffectedIds },
    });
    const fullProductMap = new Map<string, any>();
    for (const p of affectedProducts) {
      fullProductMap.set(String(p._id), p);
    }

    // Feasibility check: will stock drop below zero for any reduced or removed item?
    for (const [pid, oldData] of oldItemsMap.entries()) {
      const prod = fullProductMap.get(pid);
      if (!prod) {
        return {
          success: false,
          error: `Cannot update purchase: Part ID ${pid} was deleted from catalog.`,
        };
      }
      const newData = newItemsMap.get(pid);
      const newQty = newData ? newData.quantity : 0;
      if (newQty < oldData.quantity) {
        const qtyToDeduct = oldData.quantity - newQty;
        if (prod.quantityOnHand < qtyToDeduct) {
          return {
            success: false,
            error: `Cannot reduce quantity for "${prod.name}" by ${qtyToDeduct} unit(s). Current warehouse stock is only ${prod.quantityOnHand} unit(s) (stock has already been sold or moved).`,
          };
        }
      }
    }

    // Apply inventory adjustments & weighted cost recalculations
    for (const pid of allAffectedIds) {
      const prod = fullProductMap.get(pid);
      const oldData = oldItemsMap.get(pid);
      const newData = newItemsMap.get(pid);

      const oldQty = oldData ? oldData.quantity : 0;
      const newQty = newData ? newData.quantity : 0;
      const newCost = newData ? newData.unitCost : 0;

      const currentStock = prod.quantityOnHand || 0;
      const currentCost = prod.costPrice
        ? parseFloat(prod.costPrice.toString())
        : 0;

      // Base stock prior to this purchase
      const stockPrior = Math.max(0, currentStock - oldQty);

      if (newQty > 0) {
        const { newStock, newAverageCost } = calculateWeightedAverageCost(
          stockPrior,
          currentCost,
          newQty,
          newCost
        );
        prod.quantityOnHand = newStock;
        prod.costPrice = mongoose.Types.Decimal128.fromString(
          newAverageCost.toFixed(2)
        );
      } else {
        // Item removed completely
        prod.quantityOnHand = stockPrior;
      }

      await prod.save();
    }

    // Financial adjustments on Balance
    const oldBalance = Number(purchase.balance || 0);
    const oldTransport = Number(purchase.transport || 0);
    const newBalance = Math.max(0, Number((total - alreadyPaid).toFixed(2)));

    const deltaDebt = Number((newBalance - oldBalance).toFixed(2));
    const deltaTransport = Number((transport - oldTransport).toFixed(2));

    if (deltaDebt !== 0 || deltaTransport !== 0) {
      await Balance.findOneAndUpdate(
        {},
        {
          $inc: {
            totalOutstanding: deltaDebt,
            availableBalance: -deltaTransport,
          },
        },
        { upsert: true, new: true }
      );
    }

    // If supplier changed, cascade to linked payment ledgers
    const supplierChanged =
      String(purchase.supplierId) !== String(supplier._id);
    if (supplierChanged) {
      await SupplierPayment.updateMany(
        { purchase: purchase._id },
        { $set: { supplier: supplier._id } }
      );
      await OutstandingPayment.updateMany(
        { purchaseId: purchase._id },
        { $set: { recipient: supplier.name } }
      );
    }

    // Update purchase document fields
    purchase.supplierId = supplier._id;
    purchase.supplier = supplier.name;
    purchase.supplierName = supplier.name;
    purchase.purchaseDate = purchaseDate;
    purchase.items = resolvedItems as any;
    purchase.subtotal = subtotal;
    purchase.transport = transport;
    purchase.total = total;
    purchase.balance = newBalance;
    purchase.paymentStatus =
      newBalance === 0
        ? "paid"
        : alreadyPaid > 0
        ? "partial"
        : "unpaid";
    purchase.notes = validated.notes?.trim() || undefined;

    await purchase.save();

    safeRevalidatePath("/purchases");
    safeRevalidatePath(`/purchases/${id}`);
    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/products");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/");

    return {
      success: true,
      data: {
        _id: String(purchase._id),
        purchaseNumber: purchase.purchaseNumber || String(purchase._id),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update purchase",
    };
  }
}

export async function updateDraftPurchase(
  id: string,
  rawInput: UpdateDraftPurchaseInput
): Promise<ActionResult> {
  return await updatePurchase(id, rawInput);
}

export async function postPurchase(
  id: string,
  rawInput?: PostPurchaseInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = rawInput ? postPurchaseSchema.parse(rawInput) : { initialPayment: 0, paymentMethod: "cash" as const };

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return { success: false, error: "Purchase not found." };
    }

    if (purchase.status === "posted") {
      return { success: false, error: "This purchase has already been posted." };
    }

    if (purchase.status === "cancelled") {
      return { success: false, error: "Cancelled purchases cannot be posted." };
    }

    if (!purchase.items || purchase.items.length === 0) {
      return { success: false, error: "Cannot post purchase with no items." };
    }

    // 1. Verify and update all products
    const productIds = purchase.items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map<string, any>();
    for (const p of products) {
      productMap.set(String(p._id), p);
    }

    for (const item of purchase.items) {
      const prod = productMap.get(String(item.product));
      if (!prod) {
        return {
          success: false,
          error: `Product "${item.productName}" no longer exists in database.`,
        };
      }

      const currentStock = prod.quantityOnHand || 0;
      const currentCost = prod.costPrice
        ? parseFloat(prod.costPrice.toString())
        : 0;

      const { newStock, newAverageCost } = calculateWeightedAverageCost(
        currentStock,
        currentCost,
        item.quantity,
        item.unitCost
      );

      prod.quantityOnHand = newStock;
      prod.costPrice = mongoose.Types.Decimal128.fromString(
        newAverageCost.toFixed(2)
      );
      await prod.save();
    }

    // 2. Handle initial payment if provided
    const initialPayment = Math.min(
      purchase.total,
      Number((validated.initialPayment || 0).toFixed(2))
    );
    const balance = Math.max(0, Number((purchase.total - initialPayment).toFixed(2)));

    if (initialPayment > 0 && purchase.supplierId) {
      const paymentNumber = await generatePaymentNumber();
      await SupplierPayment.create({
        paymentNumber,
        supplier: purchase.supplierId,
        purchase: purchase._id,
        amount: initialPayment,
        paymentDate: new Date(),
        paymentMethod: validated.paymentMethod,
        reference: validated.paymentReference || undefined,
        notes: `Initial payment upon posting purchase ${purchase.purchaseNumber}`,
        status: "active",
      });

      await OutstandingPayment.create({
        amount: initialPayment,
        recipient: purchase.supplierName || "Supplier",
        purchaseId: purchase._id,
        notes: `Purchase settlement - ${purchase.purchaseNumber}`,
        paidAt: new Date(),
      });
    }

    // 3. Update Balance
    const cashOut = initialPayment + (purchase.transport || 0);
    await Balance.findOneAndUpdate(
      {},
      {
        $inc: {
          availableBalance: -cashOut,
          totalOutstanding: balance,
        },
      },
      { upsert: true, new: true }
    );

    // 4. Update purchase status
    purchase.status = "posted";
    purchase.postedAt = new Date();
    purchase.paid = initialPayment;
    purchase.balance = balance;
    purchase.paymentStatus =
      initialPayment >= purchase.total
        ? "paid"
        : initialPayment > 0
        ? "partial"
        : "unpaid";

    await purchase.save();

    safeRevalidatePath("/purchases");
    safeRevalidatePath(`/purchases/${id}`);
    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/products");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to post purchase",
    };
  }
}

export async function cancelPurchase(
  id: string,
  rawInput?: CancelPurchaseInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = rawInput ? cancelPurchaseSchema.parse(rawInput) : { reason: "" };

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return { success: false, error: "Purchase not found." };
    }

    if (purchase.status === "cancelled") {
      return { success: false, error: "Purchase is already cancelled." };
    }

    // If purchase was draft: easy cancellation (no stock or money involved)
    if (purchase.status === "draft") {
      purchase.status = "cancelled";
      purchase.cancelledAt = new Date();
      purchase.cancellationReason = validated.reason || "Draft discarded";
      await purchase.save();

      safeRevalidatePath("/purchases");
      safeRevalidatePath(`/purchases/${id}`);
      return { success: true };
    }

    // If purchase was POSTED: safe reversal required!
    // 1. Stock check: ensure current quantityOnHand >= purchased quantity
    const productIds = purchase.items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map<string, any>();
    for (const p of products) {
      productMap.set(String(p._id), p);
    }

    for (const item of purchase.items) {
      const prod = productMap.get(String(item.product));
      if (!prod) {
        return {
          success: false,
          error: `Cannot reverse stock: Product "${item.productName}" was deleted from inventory.`,
        };
      }
      if (prod.quantityOnHand < item.quantity) {
        return {
          success: false,
          error: `Cannot cancel purchase: Product "${item.productName}" only has ${prod.quantityOnHand} units in stock, but this purchase brought in ${item.quantity} units. Some stock has already been sold or moved.`,
        };
      }
    }

    // 2. Reverse stock quantities
    for (const item of purchase.items) {
      const prod = productMap.get(String(item.product));
      prod.quantityOnHand = Math.max(0, prod.quantityOnHand - item.quantity);
      await prod.save();
    }

    // 3. Reverse outstanding debt on Balance
    // Reduce totalOutstanding by remaining unpaid balance
    await Balance.findOneAndUpdate(
      {},
      {
        $inc: {
          totalOutstanding: -purchase.balance,
        },
      },
      { upsert: true }
    );

    // 4. Mark linked supplier payments as reversed
    await SupplierPayment.updateMany(
      { purchase: purchase._id },
      { $set: { status: "reversed" } }
    );

    // 5. Mark purchase as cancelled
    purchase.status = "cancelled";
    purchase.cancelledAt = new Date();
    purchase.cancellationReason = validated.reason || "Reversed by administrator";
    await purchase.save();

    safeRevalidatePath("/purchases");
    safeRevalidatePath(`/purchases/${id}`);
    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/products");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to cancel purchase",
    };
  }
}
