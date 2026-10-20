"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions, TransactionsReport } from "@/actions/transactionActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "in" | "out">("all");

  const {
    data: report,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<TransactionsReport>({
    queryKey: ["transactions"],
    queryFn: async () => await getTransactions(),
  });

  const items = report?.items ?? [];

  const filteredItems = items.filter((item) => {
    // Direction filter
    if (filterType !== "all" && item.direction !== filterType) {
      return false;
    }
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.description.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.amount.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Financial Transactions Ledger
            </h1>
            <Badge variant="brand">{items.length} Entries</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Consolidated cash-in and cash-out audit trail across sales, stock, freight, and payouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Ledger refreshed");
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw
              className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Cash In */}
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Cash In (Turnover)
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : formatCurrency(report?.totalCashIn ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sales revenue received
            </p>
          </CardContent>
        </Card>

        {/* Cash Out */}
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Cash Out (Disbursed)
            </CardTitle>
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {isLoading ? "..." : formatCurrency(report?.totalCashOut ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchases, freight, profit payouts & debts
            </p>
          </CardContent>
        </Card>

        {/* Net Flow */}
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Net Cash Flow
            </CardTitle>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <ArrowLeftRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? "..." : formatCurrency(report?.netCashFlow ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Difference between Inflows & Outflows
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
          <Button
            size="sm"
            variant={filterType === "all" ? "default" : "ghost"}
            onClick={() => setFilterType("all")}
            className="h-8 text-xs font-semibold"
          >
            All Ledger
          </Button>
          <Button
            size="sm"
            variant={filterType === "in" ? "default" : "ghost"}
            onClick={() => setFilterType("in")}
            className="h-8 text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <ArrowDownLeft className="size-3" />
            Inflows Only
          </Button>
          <Button
            size="sm"
            variant={filterType === "out" ? "default" : "ghost"}
            onClick={() => setFilterType("out")}
            className="h-8 text-xs font-semibold gap-1 text-rose-600 dark:text-rose-400"
          >
            <ArrowUpRight className="size-3" />
            Outflows Only
          </Button>
        </div>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading ledger transactions...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No transactions match the selected criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Flow</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((tx) => {
                  const isIn = tx.direction === "in";
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-semibold text-xs whitespace-nowrap">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "Sale"
                              ? "success"
                              : tx.type === "Profit"
                              ? "brand"
                              : tx.type === "Transport"
                              ? "secondary"
                              : "outline"
                          }
                          className="font-bold text-[11px]"
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${
                            isIn
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isIn ? (
                            <>
                              <ArrowDownLeft className="size-3.5" />
                              IN
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="size-3.5" />
                              OUT
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-black text-base whitespace-nowrap ${
                          isIn
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isIn ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
