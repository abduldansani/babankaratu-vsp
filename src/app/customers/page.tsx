"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCustomers,
  deleteCustomer,
  toggleCustomerActive,
  CustomerViewItem,
} from "@/actions/customerActions";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  HandCoins,
  Edit,
  Trash2,
  AlertTriangle,
  Phone,
  Mail,
  UserX,
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
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import CustomerDetailsDialog from "@/components/customers/CustomerDetailsDialog";
import RecordCustomerPaymentDialog from "@/components/sales/RecordCustomerPaymentDialog";
import CustomerPaymentReceiptModal from "@/components/sales/CustomerPaymentReceiptModal";
import SaleReceiptModal from "@/components/sales/SaleReceiptModal";
import { toast } from "sonner";

export default function CustomersPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerViewItem | null>(null);
  const [detailsCustomerId, setDetailsCustomerId] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerViewItem | null>(null);

  // Payment dialog state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    customerId: string;
    customerName: string;
    maxAmount: number;
  } | null>(null);

  // Receipt modals
  const [paymentReceiptModalOpen, setPaymentReceiptModalOpen] = useState(false);
  const [activePaymentDoc, setActivePaymentDoc] = useState<any>(null);

  const [saleReceiptModalOpen, setSaleReceiptModalOpen] = useState(false);
  const [activeSaleDoc, setActiveSaleDoc] = useState<any>(null);

  const isActiveParam =
    activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["customers", search, isActiveParam, page],
    queryFn: async () =>
      await getCustomers({
        search,
        isActive: isActiveParam,
        page,
        limit,
      }),
  });

  const customers = data?.items || [];
  const metrics = data?.metrics || {
    totalCustomers: 0,
    activeCustomers: 0,
    totalCustomerDebt: 0,
  };
  const pagination = data?.pagination || { page: 1, limit, total: 0, totalPages: 1 };

  const handleDeleteOrDeactivate = async () => {
    if (!customerToDelete) return;
    try {
      const res = await deleteCustomer(customerToDelete._id);
      if (res.success) {
        toast.success(`Customer "${customerToDelete.name}" deleted.`);
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        // Fallback: If cannot delete due to transaction history, inform user
        toast.error(res.error || "Cannot delete customer with transaction history.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process customer removal.");
    } finally {
      setCustomerToDelete(null);
    }
  };

  const handleToggleActive = async (cust: CustomerViewItem) => {
    try {
      const res = await toggleCustomerActive(cust._id);
      if (res.success) {
        toast.success(
          `Customer "${cust.name}" ${cust.isActive ? "deactivated" : "activated"}.`
        );
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        toast.error(res.error || "Failed to update status.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error toggling status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Customer Directory
            </h1>
            <Badge variant="outline" className="font-bold border-primary/30 text-primary">
              {metrics.totalCustomers} Total
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customers, track spare-parts sales on credit, and record repayments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Customer list refreshed");
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5 font-bold shadow-md shadow-primary/20"
          >
            <Plus className="size-4" />
            <span>New Customer</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Customers
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {metrics.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered vehicle owners & workshops
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Accounts
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.activeCustomers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Eligible for sales and transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Customer Receivables
            </CardTitle>
            <HandCoins className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(metrics.totalCustomerDebt)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding debt owed to the business
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/60 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, phone number, or address..."
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
            value={activeFilter}
            onValueChange={(val) => {
              setActiveFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Address</TableHead>
              <TableHead className="font-bold text-center">Sales Count</TableHead>
              <TableHead className="font-bold text-right">Total Purchased</TableHead>
              <TableHead className="font-bold text-right">Total Paid</TableHead>
              <TableHead className="font-bold text-right">Outstanding Debt</TableHead>
              <TableHead className="font-bold text-center">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <RefreshCw className="size-6 animate-spin text-primary" />
                    <span className="text-sm font-medium">Loading customers...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Users className="size-8 stroke-[1.5]" />
                    <span className="text-base font-semibold text-foreground">
                      No customers found
                    </span>
                    <span className="text-xs">
                      {search ? "Try adjusting your search criteria" : "Register your first customer to get started"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((cust) => {
                const hasDebt = cust.outstandingBalance > 0;
                return (
                  <TableRow key={cust._id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <span className="font-bold text-sm text-foreground block">
                          {cust.name}
                        </span>
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                          {cust.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="size-3" />
                              {cust.phone}
                            </span>
                          )}
                          {cust.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3" />
                              {cust.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {cust.address || "—"}
                    </TableCell>

                    <TableCell className="text-center font-medium text-xs">
                      {cust.salesCount}
                    </TableCell>

                    <TableCell className="text-right text-xs font-semibold text-foreground">
                      {formatCurrency(cust.totalPurchasedAmount)}
                    </TableCell>

                    <TableCell className="text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(cust.totalPaidAmount)}
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <span
                        className={`font-black ${
                          hasDebt
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatCurrency(cust.outstandingBalance)}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={cust.isActive ? "default" : "secondary"}
                        className="text-[10px] uppercase font-bold"
                      >
                        {cust.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasDebt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                            onClick={() => {
                              setPaymentTarget({
                                customerId: cust._id,
                                customerName: cust.name,
                                maxAmount: cust.outstandingBalance,
                              });
                              setPaymentModalOpen(true);
                            }}
                            title="Record Debt Repayment"
                          >
                            <HandCoins className="size-3.5" />
                            <span>Pay</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => setDetailsCustomerId(cust._id)}
                          title="View Customer Details & History"
                        >
                          <Eye className="size-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => {
                            setCustomerToEdit(cust);
                            setCreateModalOpen(true);
                          }}
                          title="Edit Customer"
                        >
                          <Edit className="size-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => setCustomerToDelete(cust)}
                          title="Delete or Deactivate Customer"
                        >
                          <Trash2 className="size-3.5" />
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
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total customers)
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

      {/* Customer Form Dialog (Create / Edit) */}
      <CustomerFormDialog
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
      />

      {/* Customer Details Dialog */}
      <CustomerDetailsDialog
        customerId={detailsCustomerId}
        open={Boolean(detailsCustomerId)}
        onOpenChange={(open) => {
          if (!open) setDetailsCustomerId(null);
        }}
        onRecordPayment={(cust) => {
          setPaymentTarget({
            customerId: cust.id,
            customerName: cust.name,
            maxAmount: cust.balance,
          });
          setPaymentModalOpen(true);
        }}
        onPrintSaleReceipt={(sale) => {
          setActiveSaleDoc(sale);
          setSaleReceiptModalOpen(true);
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

      {/* Payment Receipt Modal */}
      <CustomerPaymentReceiptModal
        open={paymentReceiptModalOpen}
        onOpenChange={setPaymentReceiptModalOpen}
        payment={activePaymentDoc}
      />

      {/* Sale Receipt Modal */}
      <SaleReceiptModal
        open={saleReceiptModalOpen}
        onOpenChange={setSaleReceiptModalOpen}
        sale={activeSaleDoc}
      />

      {/* Delete / Deactivate Confirmation */}
      <AlertDialog
        open={Boolean(customerToDelete)}
        onOpenChange={(open) => {
          if (!open) setCustomerToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Delete Customer
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove customer{" "}
              <strong className="text-foreground">{customerToDelete?.name}</strong>?
              If this customer has historical sales or repayments, deletion will be blocked to preserve historical accounting records, but you can deactivate the customer instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {customerToDelete?.isActive && (
              <Button
                variant="outline"
                onClick={() => {
                  if (customerToDelete) {
                    handleToggleActive(customerToDelete);
                    setCustomerToDelete(null);
                  }
                }}
                className="gap-1.5"
              >
                <UserX className="size-4" />
                Deactivate Instead
              </Button>
            )}
            <AlertDialogAction
              onClick={handleDeleteOrDeactivate}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
