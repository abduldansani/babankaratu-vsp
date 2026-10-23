"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getSupplierById } from "@/actions/supplierActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import {
  Phone,
  Mail,
  MapPin,
  User,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import Link from "next/link";

interface SupplierDetailsDialogProps {
  supplierId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordPayment?: (supplierId: string, supplierName: string) => void;
  onEditSupplier?: () => void;
}

export default function SupplierDetailsDialog({
  supplierId,
  open,
  onOpenChange,
  onRecordPayment,
  onEditSupplier,
}: SupplierDetailsDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["supplier-details", supplierId],
    queryFn: async () => {
      if (!supplierId) return null;
      return await getSupplierById(supplierId);
    },
    enabled: open && !!supplierId,
  });

  const supplier = data?.supplier;
  const metrics = data?.metrics;
  const purchases = data?.purchases || [];
  const payments = data?.payments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading || !supplier ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading supplier profile & transaction history...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Profile */}
            <DialogHeader className="border-b border-border/70 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <DialogTitle className="text-2xl font-black text-foreground">
                      {supplier.name}
                    </DialogTitle>
                    {supplier.isActive ? (
                      <Badge variant="success">Active Vendor</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs">
                    Registered on {formatDate(supplier.createdAt)} • Derived Ledger History
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  {onEditSupplier && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onEditSupplier();
                      }}
                    >
                      Edit Profile
                    </Button>
                  )}
                  {metrics && metrics.outstandingBalance > 0 && onRecordPayment && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onRecordPayment(supplier._id, supplier.name);
                      }}
                      className="gap-1.5 shadow-sm"
                    >
                      <CreditCard className="size-4" />
                      <span>Record Payment</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Contact metadata strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-xs text-muted-foreground">
                {supplier.contactPerson && (
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{supplier.contactPerson}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary shrink-0" />
                    <a
                      href={`tel:${supplier.phone}`}
                      className="hover:underline text-foreground"
                    >
                      {supplier.phone}
                    </a>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-primary shrink-0" />
                    <a
                      href={`mailto:${supplier.email}`}
                      className="hover:underline text-foreground truncate"
                    >
                      {supplier.email}
                    </a>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
              </div>

              {supplier.notes && (
                <div className="mt-3 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
                  <span className="font-semibold text-foreground">Terms / Bank Details: </span>
                  <span className="text-muted-foreground">{supplier.notes}</span>
                </div>
              )}
            </DialogHeader>

            {/* Financial Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Total Invoiced Obligations</span>
                  <ShoppingBag className="size-4 text-blue-500" />
                </div>
                <div className="text-xl font-black text-foreground mt-1.5">
                  {formatCurrency(metrics?.totalPurchased || 0)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {metrics?.purchasesCount || 0} purchase orders recorded
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Settled Remittances</span>
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
                  {formatCurrency(metrics?.totalPaid || 0)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {metrics?.paymentsCount || 0} payments confirmed
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Outstanding Payables</span>
                  <AlertTriangle className="size-4 text-amber-500" />
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
                  {formatCurrency(metrics?.outstandingBalance || 0)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Total unremitted balance
                </p>
              </div>
            </div>

            {/* Tabs for Purchases and Payments */}
            <Tabs defaultValue="purchases" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="purchases" className="gap-1.5">
                  <Receipt className="size-3.5" />
                  <span>Purchases ({purchases.length})</span>
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-1.5">
                  <CreditCard className="size-3.5" />
                  <span>Payments ({payments.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Purchases Tab */}
              <TabsContent value="purchases" className="pt-3">
                {purchases.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No purchase orders recorded for this supplier.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/70 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases.map((p: any) => (
                          <TableRow key={p._id}>
                            <TableCell className="font-mono font-bold text-xs">
                              {p.purchaseNumber || `PUR-${p._id.slice(-6)}`}
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDate(p.purchaseDate)}
                            </TableCell>
                            <TableCell>
                              {p.status === "posted" ? (
                                <Badge variant="success" className="text-[10px]">
                                  Posted
                                </Badge>
                              ) : p.status === "draft" ? (
                                <Badge variant="warning" className="text-[10px]">
                                  Draft
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">
                                  Cancelled
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-xs">
                              {formatCurrency(p.total || 0)}
                            </TableCell>
                            <TableCell className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              {formatCurrency(p.paid || 0)}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(p.balance || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                href={`/purchases/${p._id}`}
                                className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
                              >
                                View
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="pt-3">
                {payments.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No supplier payments recorded yet.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/70 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reference / Note</TableHead>
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
                            <TableCell className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(pm.amount)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {pm.reference || pm.notes || "-"}
                            </TableCell>
                            <TableCell>
                              {pm.status === "active" ? (
                                <Badge variant="success" className="text-[10px]">
                                  Active
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
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
