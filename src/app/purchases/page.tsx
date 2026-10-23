"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPurchases,
  postPurchase,
  cancelPurchase,
  PurchaseListItem,
} from "@/actions/purchaseActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  ShoppingBag,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  FileEdit,
  Ban,
  CreditCard,
  Eye,
  ChevronLeft,
  ChevronRight,
  Pencil,
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
import PurchaseFormDialog from "@/components/purchases/PurchaseFormDialog";
import RecordPaymentDialog from "@/components/purchases/RecordPaymentDialog";
import Link from "next/link";
import { toast } from "sonner";

export default function PurchasesPage() {
  const queryClient = useQueryClient();

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Dialogs
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    purchaseId: string;
    purchaseNumber: string;
    supplierId: string;
    supplierName: string;
    balance: number;
  } | null>(null);

  // Cancellation state
  const [purchaseToCancel, setPurchaseToCancel] = useState<PurchaseListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Posting draft state
  const [postingDraftId, setPostingDraftId] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["purchases", search, statusFilter, paymentFilter, page],
    queryFn: async () =>
      await getPurchases({
        search,
        status: statusFilter as any,
        paymentStatus: paymentFilter as any,
        page,
        limit,
      }),
  });

  const purchases = data?.items || [];
  const metrics = data?.metrics || {
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    draftsCount: 0,
  };
  const pagination = data?.pagination || {
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  };

  const handlePostDraft = async (id: string, purchaseNumber: string) => {
    setPostingDraftId(id);
    try {
      const res = await postPurchase(id);
      if (res.success) {
        toast.success(`Purchase ${purchaseNumber} posted! Stock updated.`);
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      } else {
        toast.error(res.error || "Failed to post purchase draft");
      }
    } catch {
      toast.error("An error occurred while posting draft");
    } finally {
      setPostingDraftId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!purchaseToCancel) return;
    setCancelling(true);
    try {
      const res = await cancelPurchase(purchaseToCancel._id, {
        reason: cancelReason.trim() || undefined,
      });

      if (res.success) {
        toast.success(
          `Purchase ${purchaseToCancel.purchaseNumber} cancelled and reversed successfully.`
        );
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      } else {
        toast.error(res.error || "Failed to cancel purchase");
      }
    } catch {
      toast.error("An error occurred while reversing the purchase order");
    } finally {
      setCancelling(false);
      setPurchaseToCancel(null);
      setCancelReason("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Inventory Purchases
            </h1>
            <Badge variant="brand">{pagination.total} Invoices</Badge>
            {metrics.draftsCount > 0 && (
              <Badge variant="warning" className="text-[11px]">
                {metrics.draftsCount} Drafts Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Supplier orders, restock invoices, creditor liabilities, and warehouse receipts.
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
              Total Invoiced Obligations
            </CardTitle>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? "..." : formatCurrency(metrics.totalInvoiced)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Posted gross inventory purchases
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Settled Remittances
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : formatCurrency(metrics.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cash paid out to suppliers
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Outstanding Creditor Debt
            </CardTitle>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {isLoading ? "..." : formatCurrency(metrics.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid balances to settle
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pending Draft Orders
            </CardTitle>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <FileEdit className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">
              {isLoading ? "..." : metrics.draftsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Drafts pending warehouse stock receipt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, supplier, part name or notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="posted">Posted Only</SelectItem>
              <SelectItem value="draft">Drafts Only</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Status Filter */}
          <Select
            value={paymentFilter}
            onValueChange={(val) => {
              setPaymentFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="All Payments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="paid">Fully Settled</SelectItem>
              <SelectItem value="partial">Partially Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading purchase orders...
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No purchase orders found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-center">Parts</TableHead>
                    <TableHead>Total (₦)</TableHead>
                    <TableHead>Paid (₦)</TableHead>
                    <TableHead>Balance (₦)</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => {
                    const isDraft = purchase.status === "draft";
                    const isPosted = purchase.status === "posted";
                    const isCancelled = purchase.status === "cancelled";
                    const hasDebt = isPosted && purchase.balance > 0;

                    return (
                      <TableRow key={purchase._id}>
                        <TableCell>
                          <Link
                            href={`/purchases/${purchase._id}`}
                            className="font-mono font-bold text-xs text-primary hover:underline"
                          >
                            {purchase.purchaseNumber}
                          </Link>
                        </TableCell>

                        <TableCell className="font-semibold text-xs whitespace-nowrap">
                          {formatDate(purchase.purchaseDate)}
                        </TableCell>

                        <TableCell className="font-bold text-sm">
                          {purchase.supplierName}
                        </TableCell>

                        <TableCell className="text-center font-semibold text-xs">
                          {purchase.itemsCount > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {purchase.itemsCount} {purchase.itemsCount === 1 ? "part" : "parts"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>

                        <TableCell className="font-semibold text-xs text-foreground">
                          {formatCurrency(purchase.total)}
                        </TableCell>

                        <TableCell className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(purchase.paid)}
                        </TableCell>

                        <TableCell className="font-bold text-xs">
                          {isCancelled ? (
                            <span className="text-muted-foreground line-through">
                              {formatCurrency(purchase.balance)}
                            </span>
                          ) : hasDebt ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {formatCurrency(purchase.balance)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ₦0.00
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {isPosted ? (
                            <Badge variant="success" className="text-[11px] font-semibold gap-1">
                              <PackageCheck className="size-3" />
                              <span>Posted</span>
                            </Badge>
                          ) : isDraft ? (
                            <Badge variant="warning" className="text-[11px] font-semibold gap-1">
                              <FileEdit className="size-3" />
                              <span>Draft</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[11px] font-semibold gap-1">
                              <Ban className="size-3" />
                              <span>Cancelled</span>
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {isCancelled ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Void
                            </Badge>
                          ) : purchase.paymentStatus === "paid" ? (
                            <Badge variant="success" className="text-[10px]">
                              Settled
                            </Badge>
                          ) : purchase.paymentStatus === "partial" ? (
                            <Badge variant="warning" className="text-[10px]">
                              Partial
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Unpaid
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View / Print Details */}
                            <Link href={`/purchases/${purchase._id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                title="View Details & Print Receipt"
                              >
                                <Eye className="size-4" />
                              </Button>
                            </Link>

                            {/* Edit Purchase (Draft or Posted) */}
                            {!isCancelled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                title="Edit Purchase Order & Recalculate"
                                onClick={() => {
                                  setEditPurchaseId(purchase._id);
                                  setEditModalOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            )}

                            {/* Quick Post draft */}
                            {isDraft && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                title="Post Draft (Increment Stock)"
                                disabled={postingDraftId === purchase._id}
                                onClick={() =>
                                  handlePostDraft(
                                    purchase._id,
                                    purchase.purchaseNumber
                                  )
                                }
                              >
                                <PackageCheck className="size-4" />
                              </Button>
                            )}

                            {/* Record Payment */}
                            {hasDebt && purchase.supplierId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-primary hover:text-primary hover:bg-primary/10"
                                title="Record Remittance Payment"
                                onClick={() => {
                                  setPaymentTarget({
                                    purchaseId: purchase._id,
                                    purchaseNumber: purchase.purchaseNumber,
                                    supplierId: purchase.supplierId!,
                                    supplierName: purchase.supplierName,
                                    balance: purchase.balance,
                                  });
                                  setPaymentModalOpen(true);
                                }}
                              >
                                <CreditCard className="size-4" />
                              </Button>
                            )}

                            {/* Cancel / Reverse Button */}
                            {!isCancelled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title={isDraft ? "Discard Draft" : "Cancel & Reverse Stock"}
                                onClick={() => {
                                  setPurchaseToCancel(purchase);
                                  setCancelReason("");
                                }}
                              >
                                <Ban className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Showing Page <span className="font-bold">{pagination.page}</span> of{" "}
                <span className="font-bold">{pagination.totalPages}</span> ({pagination.total} total)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="size-8 p-0"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="size-8 p-0"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Create Modal */}
      <PurchaseFormDialog
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
      />

      {/* Purchase Edit Modal */}
      <PurchaseFormDialog
        open={editModalOpen}
        onOpenChange={(isOpen) => {
          setEditModalOpen(isOpen);
          if (!isOpen) setEditPurchaseId(null);
        }}
        purchaseIdToEdit={editPurchaseId}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Record Payment Dialog */}
      {paymentTarget && (
        <RecordPaymentDialog
          open={paymentModalOpen}
          onOpenChange={(open) => {
            setPaymentModalOpen(open);
            if (!open) setPaymentTarget(null);
          }}
          purchaseId={paymentTarget.purchaseId}
          purchaseNumber={paymentTarget.purchaseNumber}
          supplierId={paymentTarget.supplierId}
          supplierName={paymentTarget.supplierName}
          currentBalance={paymentTarget.balance}
        />
      )}

      {/* Cancellation & Stock Reversal Alert Dialog */}
      <AlertDialog
        open={!!purchaseToCancel}
        onOpenChange={(open) => !open && setPurchaseToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              {purchaseToCancel?.status === "draft"
                ? "Discard Purchase Draft?"
                : "Cancel & Reverse Posted Purchase?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                Are you sure you want to cancel purchase{" "}
                <strong className="text-foreground">
                  {purchaseToCancel?.purchaseNumber}
                </strong>
                ?
              </span>

              {purchaseToCancel?.status === "posted" ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Stock & Accounting Reversal:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Purchased part quantities will be subtracted from current stock.</li>
                    <li>If any units have already been sold, cancellation will be rejected.</li>
                    <li>Linked payment records will be marked reversed.</li>
                    <li>Supplier outstanding balance will be reduced accordingly.</li>
                  </ul>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground block">
                  This draft has not affected warehouse stock or creditor ledgers. It will simply be marked as cancelled.
                </span>
              )}

              <div className="pt-2">
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Reason for cancellation (optional):
                </label>
                <Input
                  placeholder="e.g. Returned damaged goods, ordered in error"
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
    </div>
  );
}
