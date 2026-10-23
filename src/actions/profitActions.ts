"use server";

import dbConnect from "@/lib/dbConnect";
import { Sale, Purchase, ProfitTaking, Balance } from "@/models";
import { getMonthDateRange } from "@/utils/formatDate";
import { revalidatePath } from "next/cache";

export interface ProfitOverview {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  totalProfitTaken: number;
  retainedProfit: number;
  history: Array<{
    _id: string;
    amount: number;
    recipient?: string;
    notes?: string;
    takenAt: string;
  }>;
}

export async function getProfitOverview(): Promise<ProfitOverview> {
  await dbConnect();

  const now = new Date();
  const { startDate, endDate } = getMonthDateRange(now);

  const [salesAgg, purchasesAgg, profitTakingDocs] = await Promise.all([
    Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate, $lte: endDate },
          status: { $ne: "cancelled" },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Purchase.aggregate([
      { $match: { purchaseDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$total" },
          totalTransport: { $sum: "$transport" },
        },
      },
    ]),
    ProfitTaking.find().sort({ takenAt: -1, createdAt: -1 }).limit(50).lean(),
  ]);

  const totalRevenue = salesAgg[0]?.total ?? 0;
  const totalExpenses = (purchasesAgg[0]?.totalCost ?? 0) + (purchasesAgg[0]?.totalTransport ?? 0);
  const grossProfit = totalRevenue - totalExpenses;

  const totalProfitTaken = profitTakingDocs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const retainedProfit = grossProfit - totalProfitTaken;

  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    totalProfitTaken,
    retainedProfit,
    history: JSON.parse(JSON.stringify(profitTakingDocs)),
  };
}

export async function recordProfitTaking(data: {
  amount: number;
  recipient?: string;
  notes?: string;
  takenAt?: string | Date;
}) {
  await dbConnect();

  const amount = Number(data.amount) || 0;
  const takenAt = data.takenAt ? new Date(data.takenAt) : new Date();

  const doc = await ProfitTaking.create({
    amount,
    recipient: data.recipient || "Partner",
    notes: data.notes || "",
    takenAt,
  });

  // Deduct from available cash balance
  await Balance.findOneAndUpdate(
    {},
    { $inc: { availableBalance: -amount } },
    { upsert: true, new: true }
  );

  revalidatePath("/");
  revalidatePath("/profit");
  revalidatePath("/transactions");

  return JSON.parse(JSON.stringify(doc));
}
