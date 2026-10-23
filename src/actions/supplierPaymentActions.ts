"use server";

import dbConnect from "@/lib/dbConnect";
import {
  Supplier,
  Purchase,
  SupplierPayment,
  Balance,
  OutstandingPayment,
} from "@/models";
import {
  recordSupplierPaymentSchema,
  reverseSupplierPaymentSchema,
  RecordSupplierPaymentInput,
  ReverseSupplierPaymentInput,
} from "@/lib/validations/supplierPayment";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import crypto from "crypto";
import mongoose from "mongoose";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function generatePaymentNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PAY-${y}${m}${d}-${rand}`;
}

export async function recordSupplierPayment(
  rawInput: RecordSupplierPaymentInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = recordSupplierPaymentSchema.parse(rawInput);

    const supplier = await Supplier.findById(validated.supplierId);
    if (!supplier) {
      return { success: false, error: "Supplier not found." };
    }

    let purchaseDoc = null;
    if (validated.purchaseId && validated.purchaseId.trim()) {
      purchaseDoc = await Purchase.findById(validated.purchaseId);
      if (!purchaseDoc) {
        return { success: false, error: "Linked purchase record not found." };
      }

      // Check supplier match
      if (
        purchaseDoc.supplierId &&
        String(purchaseDoc.supplierId) !== String(supplier._id)
      ) {
        return {
          success: false,
          error: "Selected purchase does not belong to this supplier.",
        };
      }

      // Must be posted
      if (purchaseDoc.status !== "posted") {
        return {
          success: false,
          error: `Cannot apply payment to a ${purchaseDoc.status} purchase. Only posted purchases can receive payments.`,
        };
      }

      // Check remaining balance
      const remainingDebt = purchaseDoc.total - purchaseDoc.paid;
      if (validated.amount > remainingDebt + 0.01) {
        return {
          success: false,
          error: `Payment amount (₦${validated.amount.toLocaleString()}) exceeds the outstanding balance on this invoice (₦${remainingDebt.toLocaleString()}).`,
        };
      }
    }

    const paymentNumber = await generatePaymentNumber();
    const paymentDate = validated.paymentDate
      ? new Date(validated.paymentDate)
      : new Date();

    const payment = await SupplierPayment.create({
      paymentNumber,
      supplier: supplier._id,
      purchase: purchaseDoc ? purchaseDoc._id : undefined,
      amount: validated.amount,
      paymentDate,
      paymentMethod: validated.paymentMethod,
      reference: validated.reference?.trim() || undefined,
      notes: validated.notes?.trim() || undefined,
      status: "active",
    });

    // Update purchase obligation if linked
    if (purchaseDoc) {
      purchaseDoc.paid = Number((purchaseDoc.paid + validated.amount).toFixed(2));
      purchaseDoc.balance = Math.max(
        0,
        Number((purchaseDoc.total - purchaseDoc.paid).toFixed(2))
      );
      purchaseDoc.paymentStatus =
        purchaseDoc.balance <= 0
          ? "paid"
          : purchaseDoc.paid > 0
          ? "partial"
          : "unpaid";
      await purchaseDoc.save();
    }

    // Update global cash Balance (-cash out, -total outstanding liability)
    await Balance.findOneAndUpdate(
      {},
      {
        $inc: {
          availableBalance: -validated.amount,
          totalOutstanding: -validated.amount,
        },
      },
      { upsert: true, new: true }
    );

    // Record in legacy OutstandingPayment for reporting compatibility
    await OutstandingPayment.create({
      amount: validated.amount,
      recipient: supplier.name,
      purchaseId: purchaseDoc ? purchaseDoc._id : undefined,
      notes: `Supplier payment (${validated.paymentMethod}) - ${paymentNumber}`,
      paidAt: paymentDate,
    });

    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/purchases");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payment)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record payment",
    };
  }
}

export async function getSupplierPayments(params: {
  supplierId?: string;
  purchaseId?: string;
  limit?: number;
} = {}) {
  await dbConnect();

  const query: Record<string, any> = { status: "active" };

  if (params.supplierId) {
    query.supplier = params.supplierId;
  }
  if (params.purchaseId) {
    query.purchase = params.purchaseId;
  }

  const limit = Math.max(1, Math.min(200, params.limit || 50));

  const payments = await SupplierPayment.find(query)
    .populate("supplier", "name contactPerson phone")
    .populate("purchase", "purchaseNumber total balance")
    .sort({ paymentDate: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return JSON.parse(JSON.stringify(payments));
}

export async function reverseSupplierPayment(
  paymentId: string,
  rawInput: ReverseSupplierPaymentInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = reverseSupplierPaymentSchema.parse(rawInput);

    const payment = await SupplierPayment.findById(paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found." };
    }

    if (payment.status === "reversed") {
      return { success: false, error: "This payment has already been reversed." };
    }

    // Revert purchase balance if linked
    if (payment.purchase) {
      const purchase = await Purchase.findById(payment.purchase);
      if (purchase) {
        purchase.paid = Math.max(
          0,
          Number((purchase.paid - payment.amount).toFixed(2))
        );
        purchase.balance = Math.max(
          0,
          Number((purchase.total - purchase.paid).toFixed(2))
        );
        purchase.paymentStatus =
          purchase.balance <= 0
            ? "paid"
            : purchase.paid > 0
            ? "partial"
            : "unpaid";
        await purchase.save();
      }
    }

    // Revert Balance (+cash back in, +debt back up)
    await Balance.findOneAndUpdate(
      {},
      {
        $inc: {
          availableBalance: payment.amount,
          totalOutstanding: payment.amount,
        },
      },
      { upsert: true, new: true }
    );

    payment.status = "reversed";
    payment.reversedAt = new Date();
    payment.reversalReason = validated.reason || "Reversed by administrator";
    await payment.save();

    safeRevalidatePath("/suppliers");
    safeRevalidatePath("/purchases");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to reverse payment",
    };
  }
}
