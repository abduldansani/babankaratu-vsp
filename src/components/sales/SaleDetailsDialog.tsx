"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSaleById, cancelSale } from "@/actions/salesActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { toast } from "sonner";
import {
  ShoppingCart,
  Printer,
  HandCoins,
  XCircle,
  Loader2,
  Calendar,
  User,
  Package,
  Receipt,
  AlertTriangle,
} from "lucide-react";

interface SaleDetailsDialogProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrintReceipt?: (sale: any) => void;
  onRecordPayment?: (target: {
    saleId: string;
    saleNumber?: string;
    customerId?: string;
    customerName?: string;
    maxAmount: number;
  }) => void;
}

export default function SaleDetailsDialog({
  saleId,
  open,
  onOpenChange,
  onPrintReceipt,
  onRecordPayment,
}: SaleDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["sale-details", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      const res = await getSaleById(saleId);
      return res.success ? (res.data as any) : null;
    },
    enabled: Boolean(saleId && open),
  });

  if (!open) return null;

  const sale = data?.sale;
  const payments = data?.payments || [];
  const isCancelled = sale?.status === "cancelled";
  const hasBalance = (sale?.balance || 0) > 0;

  const handleCancelSale = async () => {
    if (!sale) return;
    setCancelling(true);
    try {
      const res = await cancelSale(sale._id, {
        reason: cancelReason.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to cancel sale.");
        return;
      }

      toast.success(`Sale ${sale.saleNumber || ""} has been cancelled.`);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sale-details"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      setCancelModalOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  <ShoppingCart className="size-5 text-primary" />
                  {sale?.saleNumber || (sale?.isLegacy ? "Legacy Counter Sale" : "Sale Details")}
                  {sale && (
                    <Badge
                      variant={isCancelled ? "destructive" : "default"}
                      className="ml-2 uppercase text-[10px]"
                    >
                      {sale.status}
                    </Badge>
                  )}
                  {sale && (
                    <Badge
                      variant={
                        sale.paymentStatus === "paid"
                          ? "default"
                          : sale.paymentStatus === "partial"
                          ? "secondary"
                          : "destructive"
                      }
                      className="uppercase text-[10px]"
                    >
                      {sale.paymentStatus}
                    </Badge>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="size-3.5" />
                    {sale ? formatDate(sale.saleDate || sale.createdAt) : ""}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <User className="size-3.5" />
                    {sale?.customerName || (sale?.isWalkIn ? "Walk-in Customer" : "Counter Sale")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onPrintReceipt && sale && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPrintReceipt(sale)}
                    className="gap-1.5 text-xs font-bold"
                  >
                    <Printer className="size-3.5" />
                    Print Receipt
                  </Button>
                )}

                {!isCancelled && hasBalance && onRecordPayment && sale && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onRecordPayment({
                        saleId: sale._id,
                        saleNumber: sale.saleNumber,
                        customerId: sale.customerId,
                        customerName: sale.customerName,
                        maxAmount: sale.balance,
                      });
                    }}
                    className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <HandCoins className="size-3.5" />
                    Pay Balance
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading sale record...</p>
            </div>
          ) : !sale ? (
            <div className="py-12 text-center text-muted-foreground">
              Sale not found.
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {/* Cancellation Banner if cancelled */}
              {isCancelled && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="size-5 shrink-0" />
                    <div>
                      <span className="font-bold block">This sale has been cancelled.</span>
                      <span className="text-xs text-destructive/90">
                        {sale.cancellationReason || "No cancellation reason provided."}
                      </span>
                    </div>
                  </div>
                  {sale.cancelledAt && (
                    <span className="text-xs text-destructive/80 font-mono">
                      {formatDate(sale.cancelledAt)}
                    </span>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-bold">Item Description</TableHead>
                      <TableHead className="font-bold text-center w-20">Quantity</TableHead>
                      <TableHead className="font-bold text-right w-28">Unit Price</TableHead>
                      <TableHead className="font-bold text-right w-32">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items && sale.items.length > 0 ? (
                      sale.items.map((it: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <span className="font-bold text-xs text-foreground block">
                              {it.productName}
                            </span>
                            {it.partNumber && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                Part: {it.partNumber}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">
                            {it.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatCurrency(it.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-foreground">
                            {formatCurrency(it.lineTotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      // Legacy display
                      <TableRow>
                        <TableCell colSpan={3}>
                          <span className="font-bold text-xs text-foreground block">
                            Legacy Counter Aggregate Sale
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Motorcycle: {formatCurrency(sale.motorcycle || 0)} | Bicycle: {formatCurrency(sale.bicycle || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1.5 text-xs">
                  {sale.notes && (
                    <div className="mb-2">
                      <span className="font-bold text-foreground block">Notes:</span>
                      <span className="text-muted-foreground">{sale.notes}</span>
                    </div>
                  )}
                  {sale.customerPhone && (
                    <div>
                      <span className="text-muted-foreground">Customer Phone:</span>{" "}
                      <span className="font-mono font-bold text-foreground">
                        {sale.customerPhone}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Sale Category:</span>{" "}
                    <span className="font-semibold text-foreground">
                      {sale.isWalkIn ? "Walk-in Counter Sale" : sale.isLegacy ? "Legacy Sale" : "Registered Customer Sale"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrency(sale.subtotal || sale.totalAmount)}
                    </span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">- {formatCurrency(sale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-border/60 pt-1.5 text-foreground">
                    <span>Final Total:</span>
                    <span className="font-mono text-primary text-base">
                      {formatCurrency(sale.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Amount Paid:</span>
                    <span className="font-mono">{formatCurrency(sale.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-black border-t border-dashed border-border/60 pt-1.5">
                    <span className={hasBalance ? "text-rose-600" : "text-foreground"}>
                      Outstanding Debt:
                    </span>
                    <span
                      className={`font-mono ${
                        hasBalance ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(sale.balance || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Applied Payments History */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="size-3.5 text-emerald-600" />
                    Payment Transactions Applied to this Sale ({payments.length})
                  </span>
                  <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Payment #</TableHead>
                          <TableHead className="font-bold text-xs">Date</TableHead>
                          <TableHead className="font-bold text-xs">Method</TableHead>
                          <TableHead className="font-bold text-xs text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p: any) => (
                          <TableRow key={p._id}>
                            <TableCell className="font-mono font-semibold text-xs">
                              {p.paymentNumber}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(p.paymentDate || p.createdAt)}
                            </TableCell>
                            <TableCell className="text-xs capitalize font-medium">
                              {p.paymentMethod ? p.paymentMethod.replace("_", " ") : "Cash"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-black text-xs text-emerald-600">
                              {formatCurrency(p.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Cancellation Action if confirmed and not legacy */}
              {!isCancelled && !sale.isLegacy && (
                <div className="flex justify-end pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelModalOpen(true)}
                    className="text-xs text-destructive hover:bg-destructive/10 gap-1.5 font-bold"
                  >
                    <XCircle className="size-3.5" />
                    Cancel Sale & Restore Stock
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Sale Confirmation Dialog */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive font-black">
              <AlertTriangle className="size-5" />
              Cancel Sale & Reverse Inventory?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cancelling sale <strong className="text-foreground">{sale?.saleNumber}</strong> will restore all sold quantities back into inventory stock, reverse any linked customer payments, and adjust cash/customer debt balances.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason" className="text-xs font-semibold">
              Cancellation Reason (Required for audit trail)
            </Label>
            <Input
              id="cancel-reason"
              placeholder="e.g. Customer return / Order error / Duplicate entry"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              autoFocus
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSale}
              disabled={cancelling}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {cancelling && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
