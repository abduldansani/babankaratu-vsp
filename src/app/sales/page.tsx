"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSales } from "@/actions/salesActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Bike,
  Search,
  CheckCircle,
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
import NewSaleModal from "@/components/modals/NewSaleModal";
import { toast } from "sonner";

interface SaleRecord {
  _id: string;
  bicycle: number;
  motorcycle: number;
  totalAmount: number;
  notes?: string;
  saleDate: string;
}

export default function SalesPage() {
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: sales = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<SaleRecord[]>({
    queryKey: ["sales"],
    queryFn: async () => await getSales(),
  });

  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalMotoAmount = sales.reduce((sum, s) => sum + (s.motorcycle || 0), 0);
  const totalBikeAmount = sales.reduce((sum, s) => sum + (s.bicycle || 0), 0);

  const filteredSales = sales.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.notes?.toLowerCase().includes(query) ||
      s.totalAmount.toString().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Sales Records
            </h1>
            <Badge variant="brand">{sales.length} Records</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track daily turnover from motorcycle and bicycle parts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Sales list refreshed");
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
            onClick={() => setSaleModalOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>New Sale</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Sales Volume
            </CardTitle>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <ShoppingCart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? "..." : formatCurrency(totalSalesAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined sales recorded
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Motorcycle Parts
            </CardTitle>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <CheckCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {isLoading ? "..." : formatCurrency(totalMotoAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bajaj, Boxer, Haojue & general moto spares
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bicycle Parts
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Bike className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : formatCurrency(totalBikeAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bicycle spokes, rims, tubes & pedals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search sales notes or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sales List Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading sales records...
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No matching sales records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Motorcycle Parts</TableHead>
                  <TableHead>Bicycle Parts</TableHead>
                  <TableHead>Notes / Spares</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale._id}>
                    <TableCell className="font-semibold text-xs whitespace-nowrap">
                      {formatDate(sale.saleDate)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(sale.motorcycle)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(sale.bicycle)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {sale.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right font-black text-base text-foreground whitespace-nowrap">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewSaleModal open={saleModalOpen} onOpenChange={setSaleModalOpen} />
    </div>
  );
}
