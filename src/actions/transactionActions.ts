"use server";

import dbConnect from "@/lib/dbConnect";
import { Sale, Purchase, ProfitTaking, OutstandingPayment } from "@/models";

export interface TransactionItem {
  id: string;
  date: string;
  type: "Sale" | "Purchase" | "Transport" | "Profit" | "Debt Settlement";
  description: string;
  direction: "in" | "out";
  amount: number;
}

export interface TransactionsReport {
  items: TransactionItem[];
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
}

export async function getTransactions(): Promise<TransactionsReport> {
  await dbConnect();

  const [sales, purchases, profits, outstandings] = await Promise.all([
    Sale.find().sort({ saleDate: -1 }).limit(60).lean(),
    Purchase.find().sort({ purchaseDate: -1 }).limit(60).lean(),
    ProfitTaking.find().sort({ takenAt: -1 }).limit(60).lean(),
    OutstandingPayment.find().sort({ paidAt: -1 }).limit(60).lean(),
  ]);

  const items: TransactionItem[] = [];

  sales.forEach((s) => {
    items.push({
      id: s._id.toString(),
      date: new Date(s.saleDate || s.createdAt).toISOString(),
      type: "Sale",
      description: `Spare parts sale (${s.notes || "Bicycle & Motorcycle parts"})`,
      direction: "in",
      amount: s.totalAmount || 0,
    });
  });

  purchases.forEach((p) => {
    if (p.paid > 0) {
      items.push({
        id: `${p._id.toString()}-paid`,
        date: new Date(p.purchaseDate || p.createdAt).toISOString(),
        type: "Purchase",
        description: `Supplier payment (${p.supplier || "Parts restock"})`,
        direction: "out",
        amount: p.paid,
      });
    }
    if (p.transport > 0) {
      items.push({
        id: `${p._id.toString()}-trans`,
        date: new Date(p.purchaseDate || p.createdAt).toISOString(),
        type: "Transport",
        description: `Transport logistics (${p.supplier || "Restock freight"})`,
        direction: "out",
        amount: p.transport,
      });
    }
  });

  profits.forEach((pr) => {
    items.push({
      id: pr._id.toString(),
      date: new Date(pr.takenAt || pr.createdAt).toISOString(),
      type: "Profit",
      description: `Profit withdrawal (${pr.recipient || "Partner"})`,
      direction: "out",
      amount: pr.amount || 0,
    });
  });

  outstandings.forEach((o) => {
    items.push({
      id: o._id.toString(),
      date: new Date(o.paidAt || o.createdAt).toISOString(),
      type: "Debt Settlement",
      description: `Debt payment (${o.recipient || "Creditor"})`,
      direction: "out",
      amount: o.amount || 0,
    });
  });

  // Sort chronological descending
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCashIn = items
    .filter((i) => i.direction === "in")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalCashOut = items
    .filter((i) => i.direction === "out")
    .reduce((sum, i) => sum + i.amount, 0);

  const netCashFlow = totalCashIn - totalCashOut;

  return {
    items,
    totalCashIn,
    totalCashOut,
    netCashFlow,
  };
}
