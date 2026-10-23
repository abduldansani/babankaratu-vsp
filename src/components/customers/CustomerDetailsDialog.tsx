"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getCustomerById } from "@/actions/customerActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingCart,
  Receipt,
  FileText,
  HandCoins,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface CustomerDetailsDialogProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordPayment?: (customer: { id: string; name: string; balance: number }) => void;
  onPrintSaleReceipt?: (sale: any) => void;
}

export default function CustomerDetailsDialog({
  customerId,
  open,
  onOpenChange,
  onRecordPayment,
  onPrintSaleReceipt,
}: CustomerDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");

  const { data, isLoading } = useQuery({
    queryKey: ["customer-details", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const res = await getCustomerById(customerId);
      return res.success ? (res.data as any) : null;
    },
    enabled: Boolean(customerId && open),
  });

  if (!open) return null;

  const customer = data?.customer;
  const metrics = data?.metrics || {
    salesCount: 0,
    paymentsCount: 0,
    totalPurchasedAmount: 0,
    totalPaidAmount: 0,
    outstandingBalance: 0,
  };
  const sales = data?.sales || [];
  const payments = data?.payments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                {customer?.name ? customer.name.charAt(0).toUpperCase() : <User />}
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  {isLoading ? "Loading customer..." : customer?.name}
                  {customer && (
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                  {customer?.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="size-3" />
                      {customer.phone}
                    </span>
                  )}
                  {customer?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" />
                      {customer.email}
                    </span>
                  )}
                  {customer?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {customer.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {metrics.outstandingBalance > 0 && onRecordPayment && customer && (
              <Button
                onClick={() => {
                  onRecordPayment({
                    id: String(customer._id),
                    name: customer.name,
                    balance: metrics.outstandingBalance,
                  });
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
              >
                <HandCoins className="size-4" />
                Record Repayment
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Retrieving customer history...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Financial Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total Purchases
                </span>
                <span className="text-lg sm:text-xl font-black text-foreground mt-1 block">
                  {formatCurrency(metrics.totalPurchasedAmount)}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {metrics.salesCount} confirmed {metrics.salesCount === 1 ? "sale" : "sales"}
                </span>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total Payments
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {formatCurrency(metrics.totalPaidAmount)}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {metrics.paymentsCount} payments made
                </span>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm col-span-2 sm:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Current Outstanding Debt
                </span>
                <span
                  className={`text-xl sm:text-2xl font-black mt-1 block ${
                    metrics.outstandingBalance > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatCurrency(metrics.outstandingBalance)}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  {metrics.outstandingBalance > 0
                    ? "Customer has unpaid balance"
                    : "Account in good standing (no debt)"}
                </span>
              </div>
            </div>

            {/* Notes if present */}
            {customer?.notes && (
              <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground mr-1">Notes:</span>
                {customer.notes}
              </div>
            )}

            {/* Tabs for Sales vs Payments */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("sales")}
                  className={`pb-2.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                    activeTab === "sales"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingCart className="size-4" />
                  Sales History ({sales.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("payments")}
                  className={`pb-2.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                    activeTab === "payments"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Receipt className="size-4" />
                  Repayments ({payments.length})
                </button>
              </div>

              {activeTab === "sales" && (
                <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
                  {sales.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No sales records found for this customer.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Sale #</TableHead>
                          <TableHead className="font-bold">Date</TableHead>
                          <TableHead className="font-bold text-center">Items</TableHead>
                          <TableHead className="font-bold text-right">Total</TableHead>
                          <TableHead className="font-bold text-right">Paid</TableHead>
                          <TableHead className="font-bold text-right">Debt</TableHead>
                          <TableHead className="font-bold text-center">Payment</TableHead>
                          <TableHead className="font-bold text-right">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((sale: any) => {
                          const isCancelled = sale.status === "cancelled";
                          return (
                            <TableRow key={sale._id} className={isCancelled ? "opacity-60 bg-muted/20" : ""}>
                              <TableCell className="font-mono font-semibold text-xs">
                                {sale.saleNumber || `LEGACY-${String(sale._id).slice(-6)}`}
                                {isCancelled && (
                                  <Badge variant="destructive" className="ml-1 text-[10px] py-0 px-1">
                                    Cancelled
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(sale.saleDate || sale.createdAt)}
                              </TableCell>
                              <TableCell className="text-center text-xs font-medium">
                                {sale.items ? sale.items.length : 0}
                              </TableCell>
                              <TableCell className="text-right font-bold text-xs">
                                {formatCurrency(sale.totalAmount)}
                              </TableCell>
                              <TableCell className="text-right text-xs text-emerald-600 font-semibold">
                                {formatCurrency(sale.paidAmount || 0)}
                              </TableCell>
                              <TableCell className="text-right text-xs font-bold text-rose-600">
                                {formatCurrency(sale.balance || 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={
                                    sale.paymentStatus === "paid"
                                      ? "default"
                                      : sale.paymentStatus === "partial"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {sale.paymentStatus || "paid"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {onPrintSaleReceipt && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onPrintSaleReceipt(sale)}
                                    className="size-7 p-0"
                                    title="View & Print Sales Receipt"
                                  >
                                    <Receipt className="size-3.5 text-muted-foreground" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {activeTab === "payments" && (
                <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
                  {payments.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No payment records found for this customer.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Receipt #</TableHead>
                          <TableHead className="font-bold">Date</TableHead>
                          <TableHead className="font-bold">Method</TableHead>
                          <TableHead className="font-bold text-right">Amount</TableHead>
                          <TableHead className="font-bold">Allocations</TableHead>
                          <TableHead className="font-bold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((pay: any) => {
                          const isReversed = pay.status === "reversed";
                          return (
                            <TableRow key={pay._id} className={isReversed ? "opacity-60 bg-muted/20" : ""}>
                              <TableCell className="font-mono font-semibold text-xs">
                                {pay.paymentNumber}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(pay.paymentDate || pay.createdAt)}
                              </TableCell>
                              <TableCell className="text-xs capitalize font-medium">
                                {pay.paymentMethod ? pay.paymentMethod.replace("_", " ") : "Cash"}
                              </TableCell>
                              <TableCell className="text-right font-black text-xs text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(pay.amount)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {(pay.allocations || []).map((a: any, idx: number) => (
                                  <div key={idx} className="font-mono text-[11px] text-muted-foreground">
                                    {a.saleNumber || "Sale"}: {formatCurrency(a.amount)}
                                  </div>
                                ))}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={isReversed ? "destructive" : "default"}
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {pay.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
