"use server";

import dbConnect from "@/lib/dbConnect";
import { Purchase, Balance } from "@/models";
import { revalidatePath } from "next/cache";

export interface CreatePurchaseInput {
  supplier?: string;
  total: number;
  paid: number;
  balance?: number;
  transport?: number;
  notes?: string;
  purchaseDate?: string | Date;
}

export async function getPurchases(limit = 50) {
  await dbConnect();
  const purchases = await Purchase.find()
    .sort({ purchaseDate: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return JSON.parse(JSON.stringify(purchases));
}

export async function createPurchase(data: CreatePurchaseInput) {
  await dbConnect();

  const total = Number(data.total) || 0;
  const paid = Number(data.paid) || 0;
  const transport = Number(data.transport) || 0;
  const balance = data.balance !== undefined ? Number(data.balance) : Math.max(0, total - paid);
  const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();

  const newPurchase = await Purchase.create({
    supplier: data.supplier || "Supplier",
    total,
    paid,
    balance,
    transport,
    notes: data.notes || "",
    purchaseDate,
  });

  // Cash out: paid + transport
  const totalCashOut = paid + transport;

  // Update Available Balance (-cash out) and Total Outstanding (+balance)
  await Balance.findOneAndUpdate(
    {},
    {
      $inc: {
        availableBalance: -totalCashOut,
        totalOutstanding: balance,
      },
    },
    { upsert: true, new: true }
  );

  revalidatePath("/");
  revalidatePath("/purchases");
  revalidatePath("/transactions");

  return JSON.parse(JSON.stringify(newPurchase));
}
