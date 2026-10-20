"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProfitOverview, ProfitOverview } from "@/actions/profitActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Coins,
  ArrowDownCircle,
  PieChart,
  Percent,
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
import NewProfitModal from "@/components/modals/NewProfitModal";
import { toast } from "sonner";

export default function ProfitPage() {
  const [profitModalOpen, setProfitModalOpen] = useState(false);
  const [partnerRatio, setPartnerRatio] = useState(50); // 50-50 default share

  const {
    data: profit,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<ProfitOverview>({
    queryKey: ["profit-overview"],
    queryFn: async () => await getProfitOverview(),
  });

  const grossProfit = profit?.grossProfit ?? 0;
  const partner1Share = (grossProfit * partnerRatio) / 100;
  const partner2Share = grossProfit - partner1Share;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Profit & Dividend Management
            </h1>
            <Badge variant="brand">Accounting</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate gross margins, partner profit allocations, and distribution history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Profit data updated");
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setProfitModalOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Take Profit</span>
          </Button>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sales Revenue
            </CardTitle>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Coins className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? "..." : formatCurrency(profit?.totalRevenue ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total monthly inflow
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cost of Inventory
            </CardTitle>
            <div className="rounded-xl bg-muted p-2 text-muted-foreground">
              <ArrowDownCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? "..." : formatCurrency(profit?.totalExpenses ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Stock purchases & logistics
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gross Profit
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : formatCurrency(grossProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue minus inventory expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Profit Taken
            </CardTitle>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <PieChart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {isLoading
                ? "..."
                : formatCurrency(profit?.totalProfitTaken ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Retained: {formatCurrency(profit?.retainedProfit ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Sharing Calculator */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="size-5 text-primary" />
            <CardTitle className="text-base font-bold text-foreground">
              Partner Profit Sharing Simulator
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Adjust distribution percentage between store partners based on current gross profit.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold">Partner A: {partnerRatio}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={partnerRatio}
              onChange={(e) => setPartnerRatio(Number(e.target.value))}
              className="flex-1 accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
            <span className="text-xs font-semibold">Partner B: {100 - partnerRatio}%</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground">
                Partner A Share ({partnerRatio}%)
              </div>
              <div className="text-xl font-black text-primary mt-1">
                {formatCurrency(partner1Share)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs font-semibold text-muted-foreground">
                Partner B Share ({100 - partnerRatio}%)
              </div>
              <div className="text-xl font-black text-foreground mt-1">
                {formatCurrency(partner2Share)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit Taking History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              Profit Withdrawal Log
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              History of all dividends and profit distributions
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading profit records...
            </div>
          ) : !profit?.history || profit.history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No profit takings logged yet. Click &ldquo;Take Profit&rdquo; to add a distribution.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Notes / Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profit.history.map((h) => (
                  <TableRow key={h._id}>
                    <TableCell className="font-medium text-xs">
                      {formatDate(h.takenAt)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {h.recipient || "Partner"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.notes || "Dividend payout"}
                    </TableCell>
                    <TableCell className="text-right font-black text-sm text-primary">
                      {formatCurrency(h.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewProfitModal
        open={profitModalOpen}
        onOpenChange={setProfitModalOpen}
      />
    </div>
  );
}
