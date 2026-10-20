"use server";

import dbConnect from "@/lib/dbConnect";
import { Sale, Purchase, ProfitTaking, Balance, OutstandingPayment } from "@/models";
import { revalidatePath } from "next/cache";

export async function seedInitialData() {
  await dbConnect();

  const salesCount = await Sale.countDocuments();
  if (salesCount > 0) {
    return { success: false, message: "Database already contains records." };
  }

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // 1. Initial Balance
  await Balance.findOneAndUpdate(
    {},
    {
      availableBalance: 425000,
      totalOutstanding: 180000,
    },
    { upsert: true }
  );

  // 2. Sample Sales
  await Sale.create([
    {
      bicycle: 15000,
      motorcycle: 65000,
      totalAmount: 80000,
      notes: "Bajaj & Haojue brake pads, chain set",
      saleDate: daysAgo(1),
    },
    {
      bicycle: 8000,
      motorcycle: 42000,
      totalAmount: 50000,
      notes: "Tire tubes and bicycle pedals",
      saleDate: daysAgo(2),
    },
    {
      bicycle: 25000,
      motorcycle: 95000,
      totalAmount: 120000,
      notes: "Carburetor, spark plugs, engine oil carton",
      saleDate: daysAgo(4),
    },
    {
      bicycle: 12000,
      motorcycle: 78000,
      totalAmount: 90000,
      notes: "Shock absorbers, spokes and rims",
      saleDate: daysAgo(6),
    },
  ]);

  // 3. Sample Purchases
  await Purchase.create([
    {
      supplier: "Kano Auto Parts Ltd",
      total: 350000,
      paid: 250000,
      balance: 100000,
      transport: 15000,
      notes: "Motorcycle engine kits and cables",
      purchaseDate: daysAgo(7),
    },
    {
      supplier: "Kaduna Wholesale Parts",
      total: 200000,
      paid: 120000,
      balance: 80000,
      transport: 10000,
      notes: "Bicycle rims, tires, and ball bearings",
      purchaseDate: daysAgo(12),
    },
  ]);

  // 4. Sample Profit Taking
  await ProfitTaking.create([
    {
      amount: 45000,
      recipient: "Director / Partner A",
      notes: "Weekly profit share distribution",
      takenAt: daysAgo(3),
    },
  ]);

  // 5. Sample Outstanding Payment
  await OutstandingPayment.create([
    {
      amount: 50000,
      recipient: "Kano Auto Parts Ltd",
      notes: "Part settlement for engine kits",
      paidAt: daysAgo(5),
    },
  ]);

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/purchases");
  revalidatePath("/profit");
  revalidatePath("/transactions");

  return { success: true, message: "Sample store records seeded successfully!" };
}
