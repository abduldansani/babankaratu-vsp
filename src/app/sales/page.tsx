"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSales, SaleViewItem } from "@/actions/salesActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Printer,
  HandCoins,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Package,
  History,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SaleFormDialog from "@/components/sales/SaleFormDialog";
import SaleDetailsDialog from "@/components/sales/SaleDetailsDialog";
import RecordCustomerPaymentDialog from "@/components/sales/RecordCustomerPaymentDialog";
import SaleReceiptModal from "@/components/sales/SaleReceiptModal";
import CustomerPaymentReceiptModal from "@/components/sales/CustomerPaymentReceiptModal";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import NewSaleModal from "@/components/modals/NewSaleModal";
import { toast } from "sonner";

export default function SalesPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Dialog states
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [legacyModalOpen, setLegacyModalOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);

  const [detailsSaleId, setDetailsSaleId] = useState<string | null>(null);

  // Payment dialog state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    saleId: string;
    saleNumber?: string;
    customerId?: string;
    customerName?: string;
    maxAmount: number;
  } | null>(null);

  // Receipt modals
  const [activeSaleDoc, setActiveSaleDoc] = useState<any>(null);
  const [saleReceiptModalOpen, setSaleReceiptModalOpen] = useState(false);

  const [activePaymentDoc, setActivePaymentDoc] = useState<any>(null);
  const [paymentReceiptModalOpen, setPaymentReceiptModalOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["sales", search, paymentStatusFilter, statusFilter, page],
    queryFn: async () =>
      await getSales({
        search,
        paymentStatus: paymentStatusFilter,
        status: statusFilter,
        page,
        limit,
      }),
  });

  const sales: SaleViewItem[] = data?.items || [];
  const metrics = data?.metrics || {
    totalRevenue: 0,
    totalPaid: 0,
    totalOutstandingDebt: 0,
    confirmedSalesCount: 0,
  };
  const pagination = data?.pagination || { page: 1, limit, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Sales Records
            </h1>
            <Badge variant="outline" className="font-bold border-primary/30 text-primary">
              {metrics.confirmedSalesCount} Confirmed Sales
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Product inventory sales, credit tracking, customer repayments, and printable receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Sales records refreshed");
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLegacyModalOpen(true)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Record counter sale using legacy aggregate method"
          >
            <History className="size-3.5" />
            <span>Legacy Sale</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setSaleModalOpen(true)}
            className="gap-1.5 font-bold shadow-md shadow-primary/20"
          >
            <Plus className="size-4" />
            <span>New Product Sale</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Revenue
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Confirmed sales value
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cash Collected
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual cash received
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Debt
            </CardTitle>
            <CreditCard className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.totalOutstandingDebt)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receivables due from customers
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirmed Invoices
            </CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {metrics.confirmedSalesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total completed sales transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/60 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search sale #, customer name, phone, or product description..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={paymentStatusFilter}
            onValueChange={(val) => {
              setPaymentStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="unpaid">Unpaid (Credit)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold">Sale #</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold text-center">Items</TableHead>
              <TableHead className="font-bold text-right">Net Total</TableHead>
              <TableHead className="font-bold text-right">Paid</TableHead>
              <TableHead className="font-bold text-right">Balance Due</TableHead>
              <TableHead className="font-bold text-center">Payment</TableHead>
              <TableHead className="font-bold text-center">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RefreshCw className="size-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">Loading sales records...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ShoppingCart className="size-8 stroke-[1.5]" />
                    <span className="text-base font-semibold text-foreground">
                      No sales records found
                    </span>
                    <span className="text-xs">
                      {search ? "Try adjusting your search criteria" : "Record your first product sale"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sales.map((s) => {
                const isCancelled = s.status === "cancelled";
                const hasBalance = s.balance > 0;

                return (
                  <TableRow
                    key={s._id}
                    className={`hover:bg-muted/30 ${isCancelled ? "opacity-60 bg-muted/20" : ""}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-foreground">
                          {s.saleNumber}
                        </span>
                        {s.isLegacy && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-muted-foreground/40 text-muted-foreground">
                            Legacy
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(s.saleDate)}
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold text-xs text-foreground block">
                        {s.customerName || (s.isWalkIn ? "Walk-in Customer" : "Counter Sale")}
                      </span>
                      {s.customerPhone && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {s.customerPhone}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-center font-medium text-xs">
                      {s.itemCount > 0 ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {s.itemCount} items
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-bold text-xs text-foreground">
                      {formatCurrency(s.totalAmount)}
                    </TableCell>

                    <TableCell className="text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(s.paidAmount)}
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <span
                        className={`font-black ${
                          hasBalance
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(s.balance)}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={
                          s.paymentStatus === "paid"
                            ? "default"
                            : s.paymentStatus === "partial"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {s.paymentStatus}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={isCancelled ? "destructive" : "outline"}
                        className={`text-[10px] uppercase font-bold ${
                          !isCancelled ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : ""
                        }`}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isCancelled && hasBalance && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                            onClick={() => {
                              setPaymentTarget({
                                saleId: s._id,
                                saleNumber: s.saleNumber,
                                customerId: s.customerId,
                                customerName: s.customerName,
                                maxAmount: s.balance,
                              });
                              setPaymentModalOpen(true);
                            }}
                            title="Record Repayment"
                          >
                            <HandCoins className="size-3.5" />
                            <span>Pay</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => {
                            setActiveSaleDoc(s);
                            setSaleReceiptModalOpen(true);
                          }}
                          title="View & Print Sales Receipt"
                        >
                          <Printer className="size-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => setDetailsSaleId(s._id)}
                          title="View Sale Details"
                        >
                          <Eye className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total sales)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="size-8 p-0"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="size-8 p-0"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Product Sale Dialog */}
      <SaleFormDialog
        open={saleModalOpen}
        onOpenChange={setSaleModalOpen}
        onSuccess={(createdSale) => {
          setActiveSaleDoc(createdSale);
          setSaleReceiptModalOpen(true);
        }}
        onOpenCustomerCreate={() => setCustomerFormOpen(true)}
      />

      {/* Legacy Sale Modal */}
      <NewSaleModal
        open={legacyModalOpen}
        onOpenChange={setLegacyModalOpen}
      />

      {/* Customer Quick Registration Dialog */}
      <CustomerFormDialog
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
      />

      {/* Sale Details Dialog */}
      <SaleDetailsDialog
        saleId={detailsSaleId}
        open={Boolean(detailsSaleId)}
        onOpenChange={(open) => {
          if (!open) setDetailsSaleId(null);
        }}
        onPrintReceipt={(sale) => {
          setActiveSaleDoc(sale);
          setSaleReceiptModalOpen(true);
        }}
        onRecordPayment={(target) => {
          setPaymentTarget(target);
          setPaymentModalOpen(true);
        }}
      />

      {/* Record Repayment Dialog */}
      <RecordCustomerPaymentDialog
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        target={paymentTarget}
        onSuccess={(payment) => {
          setActivePaymentDoc(payment);
          setPaymentReceiptModalOpen(true);
        }}
      />

      {/* Sale Receipt Modal */}
      <SaleReceiptModal
        open={saleReceiptModalOpen}
        onOpenChange={setSaleReceiptModalOpen}
        sale={activeSaleDoc}
      />

      {/* Payment Receipt Modal */}
      <CustomerPaymentReceiptModal
        open={paymentReceiptModalOpen}
        onOpenChange={setPaymentReceiptModalOpen}
        payment={activePaymentDoc}
      />
    </div>
  );
}
