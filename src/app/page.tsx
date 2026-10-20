"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardSummary,
  getRecentActivity,
  DashboardMetrics,
} from "@/actions/dashboardActions";
import { seedInitialData } from "@/actions/seedActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  Wallet,
  ShoppingCart,
  ShoppingBag,
  AlertCircle,
  Plus,
  RefreshCw,
  Database,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import NewSaleModal from "@/components/modals/NewSaleModal";
import NewPurchaseModal from "@/components/modals/NewPurchaseModal";
import NewProfitModal from "@/components/modals/NewProfitModal";
import { toast } from "sonner";
import Link from "next/link";

export default function DashboardPage() {
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [profitModalOpen, setProfitModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // TanStack Queries
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isRefetching,
  } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => await getDashboardSummary(),
  });

  const {
    data: recent,
    isLoading: recentLoading,
    refetch: refetchRecent,
  } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => await getRecentActivity(),
  });

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedInitialData();
      if (res.success) {
        toast.success(res.message);
        refetchSummary();
        refetchRecent();
      } else {
        toast.info(res.message);
      }
    } catch {
      toast.error("Failed to seed database. Check local MongoDB status.");
    } finally {
      setSeeding(false);
    }
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchRecent();
    toast.success("Dashboard metrics refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Store Dashboard
            </h1>
            <Badge variant="brand" className="font-bold">
              Active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time sales, inventory purchases, and cash flow overview.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="gap-1.5 text-xs"
          >
            <Database className="size-3.5 text-primary" />
            <span>{seeding ? "Seeding..." : "Seed Demo Data"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setSaleModalOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>New Sale</span>
          </Button>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Cash */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Available Cash
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {summaryLoading
                ? "..."
                : formatCurrency(summary?.availableCash ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Liquid cash
              </span>{" "}
              on hand
            </p>
          </CardContent>
        </Card>

        {/* Total Monthly Sales */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Sales
            </CardTitle>
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <ShoppingCart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {summaryLoading
                ? "..."
                : formatCurrency(summary?.totalSales ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="font-semibold text-primary">
                {summary?.monthSalesCount ?? 0} transactions
              </span>{" "}
              recorded
            </p>
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Purchases Paid
            </CardTitle>
            <div className="rounded-xl bg-blue-500/15 p-2 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {summaryLoading
                ? "..."
                : formatCurrency(summary?.totalPurchases ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Supplier restock this month
            </p>
          </CardContent>
        </Card>

        {/* Outstanding Debt */}
        <Card className="relative overflow-hidden border-border/80 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding Debt
            </CardTitle>
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {summaryLoading
                ? "..."
                : formatCurrency(summary?.outstandingBalance ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Supplier credit to be cleared
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          onClick={() => setSaleModalOpen(true)}
          className="cursor-pointer text-left p-4 rounded-2xl border border-border bg-card hover:border-primary transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <ShoppingCart className="size-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">
                Record New Sale
              </div>
              <div className="text-xs text-muted-foreground">
                Motorcycle & bicycle parts
              </div>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button
          onClick={() => setPurchaseModalOpen(true)}
          className="cursor-pointer text-left p-4 rounded-2xl border border-border bg-card hover:border-primary transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">
                Log New Purchase
              </div>
              <div className="text-xs text-muted-foreground">
                Supplier restock & transport
              </div>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
        </button>

        <button
          onClick={() => setProfitModalOpen(true)}
          className="cursor-pointer text-left p-4 rounded-2xl border border-border bg-card hover:border-primary transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-foreground">
                Take Profit
              </div>
              <div className="text-xs text-muted-foreground">
                Partner dividend payout
              </div>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
        </button>
      </div>

      {/* Two Column Section: Recent Sales & Recent Purchases */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sales Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent Sales</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest customer store transactions
              </p>
            </div>
            <Link href="/sales">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all
                <ArrowUpRight className="size-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading sales...
              </div>
            ) : !recent?.recentSales || recent.recentSales.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No sales recorded yet. Click &ldquo;New Sale&rdquo; to begin.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Moto / Bike</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.recentSales.map(
                    (s: {
                      _id: string;
                      saleDate: string;
                      motorcycle: number;
                      bicycle: number;
                      totalAmount: number;
                    }) => (
                      <TableRow key={s._id}>
                        <TableCell className="font-medium text-xs">
                          {formatDate(s.saleDate)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          M: {formatCurrency(s.motorcycle)} / B:{" "}
                          {formatCurrency(s.bicycle)}
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-foreground">
                          {formatCurrency(s.totalAmount)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Recent Purchases
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest stock replenishments
              </p>
            </div>
            <Link href="/purchases">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View all
                <ArrowUpRight className="size-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading purchases...
              </div>
            ) : !recent?.recentPurchases || recent.recentPurchases.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No purchases recorded yet. Click &ldquo;Log New Purchase&rdquo;.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Paid / Bal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.recentPurchases.map(
                    (p: {
                      _id: string;
                      purchaseDate: string;
                      supplier: string;
                      paid: number;
                      balance: number;
                      total: number;
                    }) => (
                      <TableRow key={p._id}>
                        <TableCell className="font-medium text-xs">
                          {formatDate(p.purchaseDate)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {p.supplier || "Supplier"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatCurrency(p.paid)}
                          </span>
                          {p.balance > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 ml-1">
                              ({formatCurrency(p.balance)} bal)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-black text-sm text-foreground">
                          {formatCurrency(p.total)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <NewSaleModal open={saleModalOpen} onOpenChange={setSaleModalOpen} />
      <NewPurchaseModal
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
      />
      <NewProfitModal
        open={profitModalOpen}
        onOpenChange={setProfitModalOpen}
      />
    </div>
  );
}
