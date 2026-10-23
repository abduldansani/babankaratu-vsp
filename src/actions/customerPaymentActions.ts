"use server";

import dbConnect from "@/lib/dbConnect";
import {
  Customer,
  Sale,
  CustomerPayment,
  Balance,
  ICustomerPayment,
  IPaymentAllocation,
} from "@/models";
import {
  recordCustomerPaymentSchema,
  reverseCustomerPaymentSchema,
  RecordCustomerPaymentInput,
  ReverseCustomerPaymentInput,
} from "@/lib/validations/customerPayment";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import crypto from "crypto";
import mongoose from "mongoose";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function generateCustomerPaymentNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `CPAY-${y}${m}${d}-${rand}`;
}

export interface CustomerPaymentViewItem {
  _id: string;
  paymentNumber: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  status: "active" | "reversed";
  allocations: Array<{
    saleId: string;
    saleNumber?: string;
    amount: number;
  }>;
  reversedAt?: string;
  reversalReason?: string;
  createdAt: string;
}

export interface CustomerPaymentListResponse {
  items: CustomerPaymentViewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    totalPaymentsAmount: number;
    paymentsCount: number;
  };
}

export async function recordCustomerPayment(
  rawInput: RecordCustomerPaymentInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = recordCustomerPaymentSchema.parse(rawInput);

    const amount = Math.round(validated.amount * 100) / 100;
    if (amount <= 0) {
      return { success: false, error: "Payment amount must be greater than zero." };
    }

    // Determine target customer
    let customerDoc = null;
    if (validated.customerId && validated.customerId.trim()) {
      customerDoc = await Customer.findById(validated.customerId);
      if (!customerDoc) {
        return { success: false, error: "Customer not found." };
      }
    }

    // Case 1: Specific single sale payment
    if (validated.saleId && validated.saleId.trim()) {
      const sale = await Sale.findById(validated.saleId);
      if (!sale) {
        return { success: false, error: "Target sale record not found." };
      }

      if (sale.status !== "confirmed") {
        return {
          success: false,
          error: `Cannot apply payment to a ${sale.status} sale. Only confirmed sales can receive payments.`,
        };
      }

      if (customerDoc && sale.customerId && String(sale.customerId) !== String(customerDoc._id)) {
        return {
          success: false,
          error: "The selected sale does not belong to the selected customer.",
        };
      }

      if (!customerDoc && sale.customerId) {
        customerDoc = await Customer.findById(sale.customerId);
      }

      const remainingDebt = Math.round(sale.balance * 100) / 100;
      if (amount > remainingDebt + 0.01) {
        return {
          success: false,
          error: `Payment amount (₦${amount.toLocaleString()}) exceeds the outstanding balance on sale ${sale.saleNumber || ""} (₦${remainingDebt.toLocaleString()}).`,
        };
      }

      const finalAllocations: IPaymentAllocation[] = [
        {
          saleId: sale._id,
          saleNumber: sale.saleNumber,
          amount,
        },
      ];

      const paymentNumber = await generateCustomerPaymentNumber();
      const paymentDate = validated.paymentDate
        ? new Date(validated.paymentDate)
        : new Date();

      const payment = await CustomerPayment.create({
        paymentNumber,
        customerId: customerDoc ? customerDoc._id : sale.customerId,
        customerName: customerDoc ? customerDoc.name : sale.customerName || "Customer",
        amount,
        paymentDate,
        paymentMethod: validated.paymentMethod,
        reference: validated.reference?.trim() || undefined,
        notes: validated.notes?.trim() || undefined,
        allocations: finalAllocations,
        status: "active",
      });

      // Update sale balance
      sale.paidAmount = Math.round((sale.paidAmount + amount) * 100) / 100;
      sale.balance = Math.round((sale.totalAmount - sale.paidAmount) * 100) / 100;
      if (sale.balance <= 0.01) {
        sale.balance = 0;
        sale.paymentStatus = "paid";
      } else {
        sale.paymentStatus = "partial";
      }
      await sale.save();

      // Update global Balance:
      // Repayment increases availableBalance and decreases customerDebt
      await Balance.findOneAndUpdate(
        {},
        {
          $inc: {
            availableBalance: amount,
            customerDebt: -amount,
          },
        },
        { upsert: true, new: true }
      );

      safeRevalidatePath("/sales");
      safeRevalidatePath("/customers");
      safeRevalidatePath("/transactions");
      safeRevalidatePath("/dashboard");
      safeRevalidatePath("/");

      return {
        success: true,
        data: JSON.parse(JSON.stringify(payment)),
      };
    }

    // Case 2: Explicit multi-sale allocations
    if (validated.allocations && validated.allocations.length > 0) {
      const sumAllocated = validated.allocations.reduce((sum, a) => sum + a.amount, 0);
      if (Math.abs(sumAllocated - amount) > 0.01) {
        return {
          success: false,
          error: `The sum of allocated amounts (₦${sumAllocated.toLocaleString()}) must match the total payment amount (₦${amount.toLocaleString()}).`,
        };
      }

      const saleIds = validated.allocations.map((a) => a.saleId);
      const sales = await Sale.find({ _id: { $in: saleIds } });
      const saleMap = new Map<string, any>();
      sales.forEach((s) => saleMap.set(String(s._id), s));

      const processedAllocations: IPaymentAllocation[] = [];

      for (const alloc of validated.allocations) {
        const sale = saleMap.get(alloc.saleId);
        if (!sale) {
          return { success: false, error: `Sale ${alloc.saleId} was not found.` };
        }
        if (sale.status !== "confirmed") {
          return {
            success: false,
            error: `Sale ${sale.saleNumber} is ${sale.status}. Payments can only be applied to confirmed sales.`,
          };
        }
        if (customerDoc && sale.customerId && String(sale.customerId) !== String(customerDoc._id)) {
          return {
            success: false,
            error: `Sale ${sale.saleNumber} does not belong to customer ${customerDoc.name}.`,
          };
        }
        if (alloc.amount > sale.balance + 0.01) {
          return {
            success: false,
            error: `Allocated amount (₦${alloc.amount.toLocaleString()}) exceeds outstanding balance (₦${sale.balance.toLocaleString()}) for sale ${sale.saleNumber}.`,
          };
        }

        processedAllocations.push({
          saleId: sale._id,
          saleNumber: sale.saleNumber,
          amount: alloc.amount,
        });
      }

      // Apply updates to all allocated sales
      for (const alloc of validated.allocations) {
        const sale = saleMap.get(alloc.saleId);
        sale.paidAmount = Math.round((sale.paidAmount + alloc.amount) * 100) / 100;
        sale.balance = Math.round((sale.totalAmount - sale.paidAmount) * 100) / 100;
        if (sale.balance <= 0.01) {
          sale.balance = 0;
          sale.paymentStatus = "paid";
        } else {
          sale.paymentStatus = "partial";
        }
        await sale.save();
      }

      const paymentNumber = await generateCustomerPaymentNumber();
      const paymentDate = validated.paymentDate
        ? new Date(validated.paymentDate)
        : new Date();

      const payment = await CustomerPayment.create({
        paymentNumber,
        customerId: customerDoc ? customerDoc._id : undefined,
        customerName: customerDoc ? customerDoc.name : undefined,
        amount,
        paymentDate,
        paymentMethod: validated.paymentMethod,
        reference: validated.reference?.trim() || undefined,
        notes: validated.notes?.trim() || undefined,
        allocations: processedAllocations,
        status: "active",
      });

      await Balance.findOneAndUpdate(
        {},
        {
          $inc: {
            availableBalance: amount,
            customerDebt: -amount,
          },
        },
        { upsert: true, new: true }
      );

      safeRevalidatePath("/sales");
      safeRevalidatePath("/customers");
      safeRevalidatePath("/transactions");
      safeRevalidatePath("/dashboard");
      safeRevalidatePath("/");

      return {
        success: true,
        data: JSON.parse(JSON.stringify(payment)),
      };
    }

    // Case 3: Customer provided without explicit allocations -> FIFO auto-allocation across outstanding sales
    if (!customerDoc) {
      return {
        success: false,
        error: "Please specify either a customer or a specific sale to apply the payment.",
      };
    }

    const unpaidSales = await Sale.find({
      customerId: customerDoc._id,
      status: "confirmed",
      balance: { $gt: 0 },
    }).sort({ saleDate: 1, createdAt: 1 });

    const totalOutstanding = unpaidSales.reduce((sum, s) => sum + s.balance, 0);

    if (unpaidSales.length === 0) {
      return {
        success: false,
        error: `Customer ${customerDoc.name} has no outstanding debt. Overpayments are not permitted.`,
      };
    }

    if (amount > totalOutstanding + 0.01) {
      return {
        success: false,
        error: `Payment amount (₦${amount.toLocaleString()}) exceeds the customer's total outstanding debt of ₦${totalOutstanding.toLocaleString()}.`,
      };
    }

    let remainingToAllocate = amount;
    const finalAllocations: IPaymentAllocation[] = [];

    for (const sale of unpaidSales) {
      if (remainingToAllocate <= 0) break;

      const allocAmount = Math.min(remainingToAllocate, sale.balance);
      const roundedAlloc = Math.round(allocAmount * 100) / 100;

      finalAllocations.push({
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        amount: roundedAlloc,
      });

      sale.paidAmount = Math.round((sale.paidAmount + roundedAlloc) * 100) / 100;
      sale.balance = Math.round((sale.totalAmount - sale.paidAmount) * 100) / 100;
      if (sale.balance <= 0.01) {
        sale.balance = 0;
        sale.paymentStatus = "paid";
      } else {
        sale.paymentStatus = "partial";
      }
      await sale.save();

      remainingToAllocate = Math.round((remainingToAllocate - roundedAlloc) * 100) / 100;
    }

    const paymentNumber = await generateCustomerPaymentNumber();
    const paymentDate = validated.paymentDate
      ? new Date(validated.paymentDate)
      : new Date();

    const payment = await CustomerPayment.create({
      paymentNumber,
      customerId: customerDoc._id,
      customerName: customerDoc.name,
      amount,
      paymentDate,
      paymentMethod: validated.paymentMethod,
      reference: validated.reference?.trim() || undefined,
      notes: validated.notes?.trim() || undefined,
      allocations: finalAllocations,
      status: "active",
    });

    await Balance.findOneAndUpdate(
      {},
      {
        $inc: {
          availableBalance: amount,
          customerDebt: -amount,
        },
      },
      { upsert: true, new: true }
    );

    safeRevalidatePath("/sales");
    safeRevalidatePath("/customers");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payment)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to record customer payment.",
    };
  }
}

export async function reverseCustomerPayment(
  paymentId: string,
  rawInput: ReverseCustomerPaymentInput
): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return { success: false, error: "Invalid payment ID." };
    }

    const validated = reverseCustomerPaymentSchema.parse(rawInput);
    const payment = await CustomerPayment.findById(paymentId);
    if (!payment) {
      return { success: false, error: "Payment record not found." };
    }

    if (payment.status === "reversed") {
      return { success: false, error: "This payment has already been reversed." };
    }

    // 1. Revert each sale's balance
    for (const alloc of payment.allocations) {
      const sale = await Sale.findById(alloc.saleId);
      if (sale) {
        sale.paidAmount = Math.max(0, Math.round((sale.paidAmount - alloc.amount) * 100) / 100);
        sale.balance = Math.round((sale.totalAmount - sale.paidAmount) * 100) / 100;
        if (sale.paidAmount <= 0.01) {
          sale.paymentStatus = "unpaid";
        } else if (sale.balance > 0) {
          sale.paymentStatus = "partial";
        } else {
          sale.paymentStatus = "paid";
        }
        await sale.save();
      }
    }

    // 2. Revert Balance (deduct cash received from availableBalance, re-add debt to customerDebt)
    await Balance.findOneAndUpdate(
      {},
      {
        $inc: {
          availableBalance: -payment.amount,
          customerDebt: payment.amount,
        },
      },
      { upsert: true, new: true }
    );

    // 3. Mark payment as reversed
    payment.status = "reversed";
    payment.reversedAt = new Date();
    payment.reversalReason = validated.reason || "Reversed by user";
    await payment.save();

    safeRevalidatePath("/sales");
    safeRevalidatePath("/customers");
    safeRevalidatePath("/transactions");
    safeRevalidatePath("/dashboard");
    safeRevalidatePath("/");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payment)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to reverse customer payment.",
    };
  }
}

export async function getCustomerPayments(params: {
  search?: string;
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}): Promise<CustomerPaymentListResponse> {
  await dbConnect();

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {};

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    query.$or = [
      { paymentNumber: { $regex: q, $options: "i" } },
      { customerName: { $regex: q, $options: "i" } },
      { reference: { $regex: q, $options: "i" } },
      { notes: { $regex: q, $options: "i" } },
      { "allocations.saleNumber": { $regex: q, $options: "i" } },
    ];
  }

  if (params.customerId && mongoose.Types.ObjectId.isValid(params.customerId)) {
    query.customerId = new mongoose.Types.ObjectId(params.customerId);
  }

  if (params.status && params.status !== "all") {
    query.status = params.status;
  }

  const [rawPayments, totalCount, metricsAgg] = await Promise.all([
    CustomerPayment.find(query)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CustomerPayment.countDocuments(query),
    CustomerPayment.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const items: CustomerPaymentViewItem[] = rawPayments.map((p: any) => ({
    _id: String(p._id),
    paymentNumber: p.paymentNumber,
    customerId: p.customerId ? String(p.customerId) : undefined,
    customerName: p.customerName,
    amount: p.amount,
    paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString() : "",
    paymentMethod: p.paymentMethod,
    reference: p.reference,
    notes: p.notes,
    status: p.status,
    allocations: (p.allocations || []).map((a: any) => ({
      saleId: String(a.saleId),
      saleNumber: a.saleNumber,
      amount: a.amount,
    })),
    reversedAt: p.reversedAt ? new Date(p.reversedAt).toISOString() : undefined,
    reversalReason: p.reversalReason,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
  }));

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const metrics = metricsAgg[0] || { totalAmount: 0, count: 0 };

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
    },
    metrics: {
      totalPaymentsAmount: metrics.totalAmount,
      paymentsCount: metrics.count,
    },
  };
}

export async function getCustomerPaymentById(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid payment ID." };
    }

    const payment = await CustomerPayment.findById(id).lean();
    if (!payment) {
      return { success: false, error: "Payment record not found." };
    }

    // Also get the customer details and associated sales
    let customer = null;
    if (payment.customerId) {
      customer = await Customer.findById(payment.customerId).lean();
    }

    return {
      success: true,
      data: {
        payment: JSON.parse(JSON.stringify(payment)),
        customer: customer ? JSON.parse(JSON.stringify(customer)) : null,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch payment details.",
    };
  }
}
