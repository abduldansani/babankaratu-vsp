"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPurchases } from "@/actions/purchaseActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  ShoppingBag,
  Plus,
  RefreshCw,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Search,
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
import NewPurchaseModal from "@/components/modals/NewPurchaseModal";
import { toast } from "sonner";

interface PurchaseRecord {
  _id: string;
  supplier?: string;
  total: number;
  paid: number;
  balance: number;
  transport: number;
  notes?: string;
  purchaseDate: string;
}

export default function PurchasesPage() {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: purchases = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<PurchaseRecord[]>({
    queryKey: ["purchases"],
    queryFn: async () => await getPurchases(),
  });

  const totalInvoiced = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + (p.paid || 0), 0);
  const totalBalance = purchases.reduce((sum, p) => sum + (p.balance || 0), 0);
  const totalTransport = purchases.reduce((sum, p) => sum + (p.transport || 0), 0);

  const filteredPurchases = purchases.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.supplier?.toLowerCase().includes(query) ||
      p.notes?.toLowerCase().includes(query) ||
      p.total.toString().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Inventory Purchases
            </h1>
            <Badge variant="brand">{purchases.length} Invoices</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Supplier orders, restock payments, creditor balances, and logistics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Purchases refreshed");
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
            onClick={() => setPurchaseModalOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Add Purchase</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Invoiced
            </CardTitle>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? "..." : formatCurrency(totalInvoiced)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gross inventory ordered
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Amount Paid
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cash remitted to suppliers
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding Debt
            </CardTitle>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {isLoading ? "..." : formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid balances to settle
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Freight / Transport
            </CardTitle>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Truck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">
              {isLoading ? "..." : formatCurrency(totalTransport)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Delivery & handling fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search supplier, parts, or invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading purchase records...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No purchase orders found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Invoice Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status / Balance</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => {
                  const isSettled = purchase.balance <= 0;
                  return (
                    <TableRow key={purchase._id}>
                      <TableCell className="font-semibold text-xs whitespace-nowrap">
                        {formatDate(purchase.purchaseDate)}
                      </TableCell>
                      <TableCell className="font-bold text-sm">
                        {purchase.supplier || "Supplier"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {formatCurrency(purchase.total)}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(purchase.paid)}
                      </TableCell>
                      <TableCell>
                        {isSettled ? (
                          <Badge variant="success">Fully Paid</Badge>
                        ) : (
                          <Badge variant="warning">
                            Bal: {formatCurrency(purchase.balance)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {purchase.transport > 0
                          ? formatCurrency(purchase.transport)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {purchase.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewPurchaseModal
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
      />
    </div>
  );
}
