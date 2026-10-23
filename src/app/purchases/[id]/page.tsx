"use client";

import { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPurchaseById,
  postPurchase,
  cancelPurchase,
} from "@/actions/purchaseActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  Printer,
  ArrowLeft,
  CreditCard,
  PackageCheck,
  Ban,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PurchaseFormDialog from "@/components/purchases/PurchaseFormDialog";
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
import RecordPaymentDialog from "@/components/purchases/RecordPaymentDialog";
import Link from "next/link";
import { toast } from "sonner";

function PurchaseDetailsContent() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [postingDraft, setPostingDraft] = useState(false);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["purchase", id],
    queryFn: async () => await getPurchaseById(id),
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  const handlePost = async () => {
    if (!purchase) return;
    setPostingDraft(true);
    try {
      const res = await postPurchase(purchase._id);
      if (res.success) {
        toast.success("Purchase order posted! Stock inventory has been credited.");
        queryClient.invalidateQueries({ queryKey: ["purchase", id] });
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      } else {
        toast.error(res.error || "Failed to post purchase");
      }
    } catch {
      toast.error("An error occurred while posting");
    } finally {
      setPostingDraft(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!purchase) return;
    setCancelling(true);
    try {
      const res = await cancelPurchase(purchase._id, {
        reason: cancelReason.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          "Purchase cancelled and warehouse inventory safely reversed."
        );
        queryClient.invalidateQueries({ queryKey: ["purchase", id] });
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        setCancelModalOpen(false);
      } else {
        toast.error(res.error || "Failed to cancel purchase");
      }
    } catch {
      toast.error("An error occurred while cancelling purchase");
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Loading purchase order details...
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">Purchase Record Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested invoice or purchase voucher does not exist.
        </p>
        <Link href="/purchases">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Purchases
          </Button>
        </Link>
      </div>
    );
  }

  const supplier = purchase.supplierId || {
    name: purchase.supplierName || purchase.supplier || "Supplier",
  };
  const isDraft = purchase.status === "draft";
  const isPosted = purchase.status === "posted";
  const isCancelled = purchase.status === "cancelled";
  const hasDebt = isPosted && purchase.balance > 0;
  const items = purchase.items || [];
  const payments = purchase.payments || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="outline" size="icon" className="size-9">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                {purchase.purchaseNumber}
              </h1>
              {isPosted ? (
                <Badge variant="success">Posted Order</Badge>
              ) : isDraft ? (
                <Badge variant="warning">Draft Order</Badge>
              ) : (
                <Badge variant="destructive">Cancelled</Badge>
              )}

              {isCancelled ? (
                <Badge variant="outline">Void</Badge>
              ) : purchase.paymentStatus === "paid" ? (
                <Badge variant="success">Fully Settled</Badge>
              ) : purchase.paymentStatus === "partial" ? (
                <Badge variant="warning">Partially Paid</Badge>
              ) : (
                <Badge variant="destructive">Unpaid</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invoice Date: {formatDate(purchase.purchaseDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              disabled={postingDraft}
              onClick={handlePost}
            >
              <PackageCheck className="size-4" />
              <span>{postingDraft ? "Posting..." : "Post Purchase & Update Stock"}</span>
            </Button>
          )}

          {hasDebt && purchase.supplierId && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => setPaymentModalOpen(true)}
            >
              <CreditCard className="size-4" />
              <span>Record Payment</span>
            </Button>
          )}

          {!isCancelled && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEditModalOpen(true)}
            >
              <Pencil className="size-4 text-primary" />
              <span>Edit Order</span>
            </Button>
          )}

          {!isCancelled && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:bg-destructive/10"
              onClick={() => setCancelModalOpen(true)}
            >
              <Ban className="size-4" />
              <span>{isDraft ? "Discard Draft" : "Cancel & Reverse"}</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            <span>Print Invoice / Voucher</span>
          </Button>
        </div>
      </div>

      {/* Printable Purchase Document / Goods Receiving Voucher */}
      <Card className="border-border/80 shadow-sm print:border-none print:shadow-none bg-card">
        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border/80 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-primary">
                  BABAN KARATU
                </span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  SPARE PARTS
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1">
                Commercial Vehicle Spare Parts, Engine & Suspension Accessories
              </p>
              <p className="text-xs text-muted-foreground">
                Main Market, Bauchi State, Nigeria • Tel: +234 (0) 800 000 0000
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                PURCHASE ORDER & RECEIVING VOUCHER
              </span>
              <div className="font-mono text-lg font-black text-foreground">
                {purchase.purchaseNumber}
              </div>
              <div className="text-xs text-muted-foreground">
                Date: <strong className="text-foreground">{formatDate(purchase.purchaseDate)}</strong>
              </div>
              <div className="text-xs text-muted-foreground">
                Status:{" "}
                <strong className="text-foreground capitalize">{purchase.status}</strong>
              </div>
            </div>
          </div>

          {/* Supplier Info & Notes Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-border/60">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Supplier / Creditor:
              </span>
              <div className="font-bold text-base text-foreground">
                {supplier.name}
              </div>
              {supplier.contactPerson && (
                <div className="text-xs text-muted-foreground">
                  Contact Person: {supplier.contactPerson}
                </div>
              )}
              {supplier.phone && (
                <div className="text-xs text-muted-foreground">
                  Phone: {supplier.phone}
                </div>
              )}
              {supplier.email && (
                <div className="text-xs text-muted-foreground">
                  Email: {supplier.email}
                </div>
              )}
              {supplier.address && (
                <div className="text-xs text-muted-foreground">
                  Address: {supplier.address}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Order Notes & Waybill Memo:
              </span>
              <p className="text-xs text-foreground italic mt-1">
                {purchase.notes || "No special waybill notes attached."}
              </p>
              {purchase.cancellationReason && (
                <div className="p-2 rounded bg-destructive/10 text-destructive text-xs mt-2 text-left sm:text-right font-medium">
                  Cancellation Reason: {purchase.cancellationReason}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Purchased Spare Parts & Warehouse Inward Stock
            </h3>

            <div className="rounded-xl border border-border/70 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Part Name & Specification</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost (₦)</TableHead>
                    <TableHead className="text-right">Line Total (₦)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-6 text-center text-xs text-muted-foreground"
                      >
                        No itemized parts in this invoice.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-foreground">
                          {item.productName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.partNumber || "-"}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs">
                          {formatCurrency(item.unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-foreground">
                          {formatCurrency(item.lineTotal || item.quantity * item.unitCost)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="space-y-2 text-xs text-muted-foreground max-w-sm">
              <p>
                <strong>Stock Control Note:</strong> Receipt of this purchase updates
                warehouse inventory and applies weighted-average costing across existing
                stock valuation.
              </p>
            </div>

            <div className="w-full sm:w-80 space-y-2 bg-muted/20 p-4 rounded-xl border border-border/60 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(purchase.subtotal || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Logistics / Transport Fee:</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(purchase.transport || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-border/80 pt-2 text-sm font-black text-foreground">
                <span>Grand Total:</span>
                <span className="text-primary text-base">
                  {formatCurrency(purchase.total || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                <span>Total Remitted / Paid:</span>
                <span>{formatCurrency(purchase.paid || 0)}</span>
              </div>

              <div className="flex justify-between items-center border-t border-border/80 pt-2 font-bold text-sm">
                <span>Outstanding Balance:</span>
                <span
                  className={
                    purchase.balance > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {formatCurrency(purchase.balance || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Remittance History */}
          {payments.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/70">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Settlement & Payment Remittance Records
              </h3>

              <div className="rounded-xl border border-border/70 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference / Memo</TableHead>
                      <TableHead className="text-right">Amount (₦)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((pm: any) => (
                      <TableRow key={pm._id}>
                        <TableCell className="font-mono font-bold text-xs">
                          {pm.paymentNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(pm.paymentDate)}
                        </TableCell>
                        <TableCell className="text-xs uppercase font-semibold">
                          {pm.paymentMethod}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {pm.reference || pm.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(pm.amount)}
                        </TableCell>
                        <TableCell>
                          {pm.status === "active" ? (
                            <Badge variant="success" className="text-[10px]">
                              Confirmed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Reversed
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Paper Audit Sign-off for Warehouse & Store Manager (visible in print) */}
          <div className="hidden print:grid grid-cols-3 gap-8 pt-16 text-center text-xs text-muted-foreground">
            <div className="border-t border-border/80 pt-2">
              <p className="font-semibold text-foreground">Received In Good Order</p>
              <p className="text-[10px]">Storekeeper / Warehouse Officer</p>
            </div>
            <div className="border-t border-border/80 pt-2">
              <p className="font-semibold text-foreground">Verified & Inspected</p>
              <p className="text-[10px]">Inventory Quality Inspector</p>
            </div>
            <div className="border-t border-border/80 pt-2">
              <p className="font-semibold text-foreground">Authorized Approval</p>
              <p className="text-[10px]">Managing Director / Accountant</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      {purchase.supplierId && (
        <RecordPaymentDialog
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          purchaseId={purchase._id}
          purchaseNumber={purchase.purchaseNumber}
          supplierId={purchase.supplierId._id || String(purchase.supplierId)}
          supplierName={supplier.name}
          currentBalance={purchase.balance}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["purchase", id] });
          }}
        />
      )}

      {/* Cancellation Confirmation Alert Dialog */}
      <AlertDialog
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              {isDraft ? "Discard Purchase Draft?" : "Cancel & Reverse Posted Purchase?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                Are you sure you want to cancel purchase{" "}
                <strong className="text-foreground">
                  {purchase.purchaseNumber}
                </strong>
                ?
              </span>

              {isPosted ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Stock & Accounting Reversal:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Purchased part quantities will be deducted from inventory.</li>
                    <li>If any units have already been sold, cancellation will be rejected.</li>
                    <li>Linked payment records will be marked reversed.</li>
                    <li>Supplier outstanding balance will be reduced.</li>
                  </ul>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground block">
                  This draft has not affected warehouse stock or creditor ledgers.
                </span>
              )}

              <div className="pt-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Reason for cancellation (optional):
                </label>
                <Input
                  placeholder="e.g. Returned damaged shipment, invoice error"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Reversing..." : "Confirm Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Purchase Dialog */}
      <PurchaseFormDialog
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        purchaseToEdit={purchase}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase", id] });
          queryClient.invalidateQueries({ queryKey: ["purchases"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        }}
      />
    </div>
  );
}

export default function PurchaseDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading purchase order voucher...
        </div>
      }
    >
      <PurchaseDetailsContent />
    </Suspense>
  );
}
