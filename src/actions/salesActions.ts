"use server";

import dbConnect from "@/lib/dbConnect";
import { Sale, Balance } from "@/models";
import { revalidatePath } from "next/cache";

export interface CreateSaleInput {
  bicycle: number;
  motorcycle: number;
  totalAmount?: number;
  notes?: string;
  saleDate?: string | Date;
}

export async function getSales(limit = 50) {
  await dbConnect();
  const sales = await Sale.find()
    .sort({ saleDate: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return JSON.parse(JSON.stringify(sales));
}

export async function createSale(data: CreateSaleInput) {
  await dbConnect();

  const bicycle = Number(data.bicycle) || 0;
  const motorcycle = Number(data.motorcycle) || 0;
  const totalAmount = data.totalAmount !== undefined && data.totalAmount !== null 
    ? Number(data.totalAmount) 
    : bicycle + motorcycle;

  const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();

  const newSale = await Sale.create({
    bicycle,
    motorcycle,
    totalAmount,
    notes: data.notes || "",
    saleDate,
  });

  // Update Available Balance
  await Balance.findOneAndUpdate(
    {},
    { $inc: { availableBalance: totalAmount } },
    { upsert: true, new: true }
  );

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/transactions");

  return JSON.parse(JSON.stringify(newSale));
}
