"use server";

import dbConnect from "@/lib/dbConnect";
import { Customer, Sale, CustomerPayment, ICustomer } from "@/models";
import {
  createCustomerSchema,
  updateCustomerSchema,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/lib/validations/customer";
import { safeRevalidatePath } from "@/lib/safeRevalidate";
import mongoose from "mongoose";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CustomerViewItem {
  _id: string;
  name: string;
  normalizedName: string;
  phone?: string;
  normalizedPhone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  salesCount: number;
  totalPurchasedAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListResponse {
  items: CustomerViewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    totalCustomers: number;
    activeCustomers: number;
    totalCustomerDebt: number;
  };
}

export async function getCustomers(
  params: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<CustomerListResponse> {
  await dbConnect();

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {};

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    const cleanPhone = q.replace(/[^0-9+]/g, "");
    query.$or = [
      { name: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { address: { $regex: q, $options: "i" } },
    ];
    if (cleanPhone) {
      query.$or.push({ normalizedPhone: { $regex: cleanPhone } });
    }
  }

  if (params.isActive !== undefined) {
    query.isActive = params.isActive;
  }

  const [rawCustomers, totalCount, allCustomersCount, activeCustomersCount, debtAgg] =
    await Promise.all([
      Customer.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(query),
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      // Global debt across all customers from confirmed sales
      Sale.aggregate([
        {
          $match: {
            customerId: { $ne: null },
            status: "confirmed",
          },
        },
        {
          $group: {
            _id: null,
            totalDebt: { $sum: "$balance" },
          },
        },
      ]),
    ]);

  const customerIds = rawCustomers.map((c) => c._id);

  // Per-customer aggregates from confirmed sales
  const salesAgg = await Sale.aggregate([
    {
      $match: {
        customerId: { $in: customerIds },
        status: "confirmed",
      },
    },
    {
      $group: {
        _id: "$customerId",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        paidAmount: { $sum: "$paidAmount" },
        balance: { $sum: "$balance" },
      },
    },
  ]);

  const salesMap = new Map<string, { count: number; total: number; paid: number; debt: number }>();
  salesAgg.forEach((item) => {
    salesMap.set(String(item._id), {
      count: item.count || 0,
      total: item.totalAmount || 0,
      paid: item.paidAmount || 0,
      debt: item.balance || 0,
    });
  });

  const items: CustomerViewItem[] = rawCustomers.map((c) => {
    const stats = salesMap.get(String(c._id)) || {
      count: 0,
      total: 0,
      paid: 0,
      debt: 0,
    };
    return {
      _id: String(c._id),
      name: c.name,
      normalizedName: c.normalizedName,
      phone: c.phone,
      normalizedPhone: c.normalizedPhone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      isActive: c.isActive,
      salesCount: stats.count,
      totalPurchasedAmount: stats.total,
      totalPaidAmount: stats.paid,
      outstandingBalance: stats.debt,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : "",
    };
  });

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const totalCustomerDebt = debtAgg[0]?.totalDebt ?? 0;

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages,
    },
    metrics: {
      totalCustomers: allCustomersCount,
      activeCustomers: activeCustomersCount,
      totalCustomerDebt,
    },
  };
}

export async function getCustomerById(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid customer ID." };
    }

    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    const customerObjectId = new mongoose.Types.ObjectId(id);

    // Sales history
    const sales = await Sale.find({
      customerId: customerObjectId,
    })
      .sort({ saleDate: -1, createdAt: -1 })
      .lean();

    // Customer payments history
    const payments = await CustomerPayment.find({
      customerId: customerObjectId,
    })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    // Compute balance and stats from confirmed sales
    const confirmedSales = sales.filter((s) => s.status === "confirmed");
    const totalPurchasedAmount = confirmedSales.reduce(
      (sum, s) => sum + (s.totalAmount || 0),
      0
    );
    const totalPaidAmount = confirmedSales.reduce(
      (sum, s) => sum + (s.paidAmount || 0),
      0
    );
    const outstandingBalance = confirmedSales.reduce(
      (sum, s) => sum + (s.balance || 0),
      0
    );

    return {
      success: true,
      data: {
        customer: JSON.parse(JSON.stringify(customer)),
        metrics: {
          salesCount: confirmedSales.length,
          paymentsCount: payments.filter((p) => p.status === "active").length,
          totalPurchasedAmount,
          totalPaidAmount,
          outstandingBalance,
        },
        sales: JSON.parse(JSON.stringify(sales)),
        payments: JSON.parse(JSON.stringify(payments)),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch customer details.",
    };
  }
}

export async function createCustomer(
  rawInput: CreateCustomerInput
): Promise<ActionResult> {
  try {
    await dbConnect();
    const validated = createCustomerSchema.parse(rawInput);

    const normalizedName = validated.name.trim().toLowerCase();
    const normalizedPhone = validated.phone?.replace(/[^0-9+]/g, "");

    // Check duplicate
    const duplicateOr: any[] = [{ normalizedName }];
    if (normalizedPhone && normalizedPhone.length >= 7) {
      duplicateOr.push({ normalizedPhone });
    }

    const existing = await Customer.findOne({ $or: duplicateOr });
    if (existing) {
      if (existing.normalizedName === normalizedName) {
        return {
          success: false,
          error: `A customer named "${validated.name}" already exists.`,
        };
      }
      if (normalizedPhone && existing.normalizedPhone === normalizedPhone) {
        return {
          success: false,
          error: `A customer with phone number "${validated.phone}" already exists.`,
        };
      }
    }

    const customer = await Customer.create({
      name: validated.name.trim(),
      normalizedName,
      phone: validated.phone?.trim() || undefined,
      normalizedPhone: normalizedPhone || undefined,
      email: validated.email?.trim() || undefined,
      address: validated.address?.trim() || undefined,
      notes: validated.notes?.trim() || undefined,
      isActive: validated.isActive ?? true,
    });

    safeRevalidatePath("/customers");
    safeRevalidatePath("/sales");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(customer)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create customer.",
    };
  }
}

export async function updateCustomer(
  id: string,
  rawInput: UpdateCustomerInput
): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid customer ID." };
    }

    const validated = updateCustomerSchema.parse(rawInput);
    const normalizedName = validated.name.trim().toLowerCase();
    const normalizedPhone = validated.phone?.replace(/[^0-9+]/g, "");

    // Check duplicate against other customers
    const duplicateOr: any[] = [{ normalizedName }];
    if (normalizedPhone && normalizedPhone.length >= 7) {
      duplicateOr.push({ normalizedPhone });
    }

    const existing = await Customer.findOne({
      _id: { $ne: id },
      $or: duplicateOr,
    });

    if (existing) {
      if (existing.normalizedName === normalizedName) {
        return {
          success: false,
          error: `Another customer named "${validated.name}" already exists.`,
        };
      }
      if (normalizedPhone && existing.normalizedPhone === normalizedPhone) {
        return {
          success: false,
          error: `Another customer with phone number "${validated.phone}" already exists.`,
        };
      }
    }

    const updated = await Customer.findByIdAndUpdate(
      id,
      {
        name: validated.name.trim(),
        normalizedName,
        phone: validated.phone?.trim() || undefined,
        normalizedPhone: normalizedPhone || undefined,
        email: validated.email?.trim() || undefined,
        address: validated.address?.trim() || undefined,
        notes: validated.notes?.trim() || undefined,
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      { new: true }
    );

    if (!updated) {
      return { success: false, error: "Customer not found." };
    }

    safeRevalidatePath("/customers");
    safeRevalidatePath("/sales");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update customer.",
    };
  }
}

export async function toggleCustomerActive(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid customer ID." };
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    safeRevalidatePath("/customers");
    safeRevalidatePath("/sales");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(customer)),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to toggle customer status.",
    };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid customer ID." };
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    // Invariant: Customers with transaction history CANNOT be hard deleted
    const [hasSales, hasPayments] = await Promise.all([
      Sale.exists({ customerId: id }),
      CustomerPayment.exists({ customerId: id }),
    ]);

    if (hasSales || hasPayments) {
      return {
        success: false,
        error:
          "Cannot delete a customer with transaction history (sales or payments). You can deactivate the customer instead.",
      };
    }

    await Customer.findByIdAndDelete(id);

    safeRevalidatePath("/customers");
    safeRevalidatePath("/sales");

    return {
      success: true,
      data: { message: "Customer deleted successfully." },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete customer.",
    };
  }
}

export async function getActiveCustomersList(): Promise<
  Array<{ _id: string; name: string; phone?: string; outstandingBalance: number }>
> {
  await dbConnect();

  const customers = await Customer.find({ isActive: true })
    .select("_id name phone")
    .sort({ name: 1 })
    .lean();

  const customerIds = customers.map((c) => c._id);

  const debts = await Sale.aggregate([
    {
      $match: {
        customerId: { $in: customerIds },
        status: "confirmed",
      },
    },
    {
      $group: {
        _id: "$customerId",
        debt: { $sum: "$balance" },
      },
    },
  ]);

  const debtMap = new Map<string, number>();
  debts.forEach((d) => debtMap.set(String(d._id), d.debt || 0));

  return customers.map((c) => ({
    _id: String(c._id),
    name: c.name,
    phone: c.phone,
    outstandingBalance: debtMap.get(String(c._id)) || 0,
  }));
}
