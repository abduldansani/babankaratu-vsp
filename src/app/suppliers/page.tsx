"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSuppliers,
  deleteOrDeactivateSupplier,
  SupplierViewItem,
} from "@/actions/supplierActions";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  Edit,
  Trash2,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import SupplierDetailsDialog from "@/components/suppliers/SupplierDetailsDialog";
import RecordPaymentDialog from "@/components/purchases/RecordPaymentDialog";
import { toast } from "sonner";

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierViewItem | null>(null);
  const [detailsSupplierId, setDetailsSupplierId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierViewItem | null>(null);

  // Payment dialog state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    supplierId: string;
    supplierName: string;
    balance: number;
  } | null>(null);

  const isActiveParam =
    activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["suppliers", search, isActiveParam, page],
    queryFn: async () =>
      await getSuppliers({
        search,
        isActive: isActiveParam,
        page,
        limit,
      }),
  });

  const suppliers = data?.items || [];
  const metrics = data?.metrics || {
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalOutstandingDebt: 0,
  };
  const pagination = data?.pagination || {
    page: 1,
    limit,
    total: 0,
    totalPages: 1,
  };

  const handleDeactivateOrDelete = async () => {
    if (!supplierToDelete) return;
    try {
      const res = await deleteOrDeactivateSupplier(supplierToDelete._id);
      if (res.success) {
        if (res.data?.action === "deactivated") {
          toast.info(
            `Supplier has transaction history. Status updated to Inactive to preserve financial audit trail.`
          );
        } else {
          toast.success("Supplier deleted successfully.");
        }
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      } else {
        toast.error(res.error || "Failed to remove supplier");
      }
    } catch {
      toast.error("An error occurred while removing the supplier");
    } finally {
      setSupplierToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Suppliers & Creditors
            </h1>
            <Badge variant="brand">{metrics.totalSuppliers} Vendors</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Vendor accounts, purchase obligations, settlements, and contact directory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Suppliers refreshed");
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
            onClick={() => {
              setSupplierToEdit(null);
              setCreateModalOpen(true);
            }}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Add Supplier</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Suppliers
            </CardTitle>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Truck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {isLoading ? "..." : metrics.totalSuppliers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered procurement sources
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Vendors
            </CardTitle>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {isLoading ? "..." : metrics.activeSuppliers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Available for restock orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Outstanding Payables
            </CardTitle>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {isLoading ? "..." : formatCurrency(metrics.totalOutstandingDebt)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Derived net supplier liabilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by vendor name, representative, phone, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={activeFilter}
            onValueChange={(val) => {
              setActiveFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] h-10">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading suppliers directory...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No suppliers found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact & Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Purchases</TableHead>
                    <TableHead>Total Invoiced</TableHead>
                    <TableHead>Settled</TableHead>
                    <TableHead>Outstanding Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => {
                    const hasDebt = s.outstandingBalance > 0;
                    return (
                      <TableRow key={s._id}>
                        <TableCell>
                          <div className="font-bold text-sm text-foreground">
                            {s.name}
                          </div>
                          {s.contactPerson && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              Rep: {s.contactPerson}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          {s.phone ? (
                            <div className="font-semibold text-foreground">
                              {s.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          {s.email && (
                            <div className="text-muted-foreground truncate max-w-[150px]">
                              {s.email}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {s.address || "-"}
                        </TableCell>

                        <TableCell className="text-center font-bold text-xs">
                          {s.purchasesCount}
                        </TableCell>

                        <TableCell className="font-medium text-xs">
                          {formatCurrency(s.totalPurchasedAmount)}
                        </TableCell>

                        <TableCell className="font-medium text-xs text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(s.totalPaidAmount)}
                        </TableCell>

                        <TableCell>
                          {hasDebt ? (
                            <Badge variant="warning" className="font-bold">
                              {formatCurrency(s.outstandingBalance)}
                            </Badge>
                          ) : (
                            <Badge variant="success" className="font-medium">
                              Settled
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {s.isActive ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 dark:border-emerald-800">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="View History & Ledger"
                              onClick={() => setDetailsSupplierId(s._id)}
                            >
                              <Eye className="size-4" />
                            </Button>

                            {hasDebt && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-primary hover:text-primary hover:bg-primary/10"
                                title="Record Remittance"
                                onClick={() => {
                                  setPaymentTarget({
                                    supplierId: s._id,
                                    supplierName: s.name,
                                    balance: s.outstandingBalance,
                                  });
                                  setPaymentModalOpen(true);
                                }}
                              >
                                <CreditCard className="size-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Edit Supplier"
                              onClick={() => {
                                setSupplierToEdit(s);
                                setCreateModalOpen(true);
                              }}
                            >
                              <Edit className="size-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Deactivate / Delete"
                              onClick={() => setSupplierToDelete(s)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
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

      {/* Supplier Create/Edit Dialog */}
      <SupplierFormDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        supplierToEdit={supplierToEdit}
      />

      {/* Supplier Details & History Dialog */}
      <SupplierDetailsDialog
        open={!!detailsSupplierId}
        onOpenChange={(open) => !open && setDetailsSupplierId(null)}
        supplierId={detailsSupplierId}
        onRecordPayment={(id, name) => {
          const sup = suppliers.find((s) => s._id === id);
          setPaymentTarget({
            supplierId: id,
            supplierName: name,
            balance: sup?.outstandingBalance || 0,
          });
          setPaymentModalOpen(true);
        }}
        onEditSupplier={() => {
          const sup = suppliers.find((s) => s._id === detailsSupplierId);
          if (sup) {
            setSupplierToEdit(sup);
            setCreateModalOpen(true);
          }
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
          supplierId={paymentTarget.supplierId}
          supplierName={paymentTarget.supplierName}
          currentBalance={paymentTarget.balance}
        />
      )}

      {/* Confirmation Alert Dialog for Deactivation / Deletion */}
      <AlertDialog
        open={!!supplierToDelete}
        onOpenChange={(open) => !open && setSupplierToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Remove or Deactivate Supplier?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">
                {supplierToDelete?.name}
              </strong>
              ?
              <br />
              <br />
              If this supplier has past purchase orders or payment records, they will be{" "}
              <strong>safely deactivated</strong> to preserve audit trails and historical reports, rather than permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateOrDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
