"use server";

import dbConnect from "@/lib/dbConnect";
import { Sale, Purchase, Balance, ProfitTaking } from "@/models";
import { getMonthDateRange } from "@/utils/formatDate";

export interface DashboardMetrics {
  totalSales: number;
  availableCash: number;
  outstandingBalance: number;
  totalPurchases: number;
  totalProfitTaken: number;
  monthSalesCount: number;
}

export async function getDashboardSummary(): Promise<DashboardMetrics> {
  await dbConnect();

  const now = new Date();
  const { startDate, endDate } = getMonthDateRange(now);

  // Sales in current month
  const salesAgg = await Sale.aggregate([
    { $match: { saleDate: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Purchases in current month
  const purchasesAgg = await Purchase.aggregate([
    { $match: { purchaseDate: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: "$paid" },
        totalCost: { $sum: "$total" },
      },
    },
  ]);

  // Profit taken in current month
  const profitAgg = await ProfitTaking.aggregate([
    { $match: { takenAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Overall account balance document
  const balanceDoc = await Balance.findOne();

  return {
    totalSales: salesAgg[0]?.total ?? 0,
    availableCash: balanceDoc?.availableBalance ?? 0,
    outstandingBalance: balanceDoc?.totalOutstanding ?? 0,
    totalPurchases: purchasesAgg[0]?.totalPaid ?? 0,
    totalProfitTaken: profitAgg[0]?.total ?? 0,
    monthSalesCount: salesAgg[0]?.count ?? 0,
  };
}

export async function getRecentActivity() {
  await dbConnect();

  const [recentSales, recentPurchases] = await Promise.all([
    Sale.find().sort({ saleDate: -1, createdAt: -1 }).limit(5).lean(),
    Purchase.find().sort({ purchaseDate: -1, createdAt: -1 }).limit(5).lean(),
  ]);

  return {
    recentSales: JSON.parse(JSON.stringify(recentSales)),
    recentPurchases: JSON.parse(JSON.stringify(recentPurchases)),
  };
}
