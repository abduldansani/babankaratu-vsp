"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getActiveCustomersList } from "@/actions/customerActions";
import { getProducts, ProductViewItem } from "@/actions/productActions";
import { createProductSale } from "@/actions/salesActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  Search,
  Check,
  ChevronsUpDown,
  User,
  Package,
  AlertCircle,
  CreditCard,
  Receipt,
  UserPlus,
} from "lucide-react";

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (saleDoc: any) => void;
  onOpenCustomerCreate?: () => void;
}

interface SaleRow {
  productId: string;
  productName: string;
  partNumber?: string;
  stockAvailable: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export default function SaleFormDialog({
  open,
  onOpenChange,
  onSuccess,
  onOpenCustomerCreate,
}: SaleFormDialogProps) {
  const queryClient = useQueryClient();

  // Customer selection
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);

  // Line items
  const [items, setItems] = useState<SaleRow[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [activeRowIdxForSearch, setActiveRowIdxForSearch] = useState<number | null>(null);

  // Financials & Payment
  const [discount, setDiscount] = useState("0");
  const [paymentType, setPaymentType] = useState<"full" | "partial" | "credit">("full");
  const [initialPayment, setInitialPayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load customers
  const { data: customers = [] } = useQuery({
    queryKey: ["active-customers"],
    queryFn: async () => await getActiveCustomersList(),
    enabled: open,
  });

  // Load products
  const { data: productsData } = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: async () => await getProducts({ limit: 100 }),
    enabled: open,
  });

  const allProducts: ProductViewItem[] = productsData?.items || [];

  // Initialize on open
  useEffect(() => {
    if (open) {
      setIsWalkIn(false);
      setCustomerId("");
      setWalkInName("");
      setWalkInPhone("");
      setCustomerSearch("");
      setItems([
        {
          productId: "",
          productName: "",
          partNumber: "",
          stockAvailable: 0,
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
        },
      ]);
      setDiscount("0");
      setPaymentType("full");
      setInitialPayment("0");
      setPaymentMethod("cash");
      setPaymentReference("");
      setSaleDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setFormError(null);
    }
  }, [open]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c._id === customerId);
  }, [customers, customerId]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  }, [items]);

  const numDiscount = Math.max(0, parseFloat(discount) || 0);
  const totalAmount = Math.max(0, subtotal - numDiscount);

  // Synchronize initial payment with payment type
  useEffect(() => {
    if (paymentType === "full") {
      setInitialPayment(totalAmount.toString());
    } else if (paymentType === "credit") {
      setInitialPayment("0");
    }
  }, [paymentType, totalAmount]);

  const numInitialPayment = Math.max(0, parseFloat(initialPayment) || 0);
  const balance = Math.max(0, totalAmount - numInitialPayment);

  // Update item row
  const updateRow = (index: number, updates: Partial<SaleRow>) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      const updated = { ...current, ...updates };

      // Recalculate line total
      const qty = Math.max(1, updated.quantity || 1);
      const price = Math.max(0, updated.unitPrice || 0);
      updated.quantity = qty;
      updated.unitPrice = price;
      updated.lineTotal = Math.round(qty * price * 100) / 100;

      next[index] = updated;
      return next;
    });
  };

  const handleSelectProduct = (index: number, product: ProductViewItem) => {
    updateRow(index, {
      productId: product._id,
      productName: product.name,
      partNumber: product.partNumber || "",
      stockAvailable: product.quantityOnHand || 0,
      unitPrice: product.sellingPrice || 0,
      quantity: 1,
    });
    setActiveRowIdxForSearch(null);
    setProductSearch("");
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        productName: "",
        partNumber: "",
        stockAvailable: 0,
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) {
      toast.error("Sale must include at least one product row.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Filter products for dropdown
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.partNumber?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q)
    );
  }, [allProducts, productSearch]);

  // Filter customers for dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [customers, customerSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate customer
    if (!isWalkIn && !customerId) {
      setFormError("Please select a registered customer, or choose Walk-in Customer.");
      return;
    }

    if (isWalkIn && balance > 0) {
      setFormError("Credit or partial-payment sales are not permitted for walk-in customers. Please select a registered customer to track debt.");
      return;
    }

    // Validate items
    const validItems = items.filter((it) => it.productId);
    if (validItems.length === 0) {
      setFormError("Please select at least one product to sell.");
      return;
    }

    // Check stock for every item
    for (const it of validItems) {
      if (it.quantity > it.stockAvailable) {
        setFormError(
          `Requested quantity (${it.quantity}) exceeds available stock (${it.stockAvailable}) for "${it.productName}".`
        );
        return;
      }
    }

    if (totalAmount <= 0) {
      setFormError("Total sale amount cannot be zero.");
      return;
    }

    setLoading(true);
    try {
      const result = await createProductSale({
        customerId: !isWalkIn ? customerId : undefined,
        isWalkIn,
        customerName: isWalkIn ? walkInName.trim() || "Walk-in Customer" : undefined,
        customerPhone: isWalkIn ? walkInPhone.trim() || undefined : undefined,
        items: validItems.map((it) => ({
          product: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        discount: numDiscount,
        initialPayment: numInitialPayment,
        paymentMethod: paymentMethod as any,
        paymentReference: paymentReference.trim() || undefined,
        saleDate: saleDate || new Date().toISOString(),
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setFormError(result.error || "Failed to confirm sale.");
        return;
      }

      toast.success("Sale completed successfully!");

      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-sale"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      onOpenChange(false);
      onSuccess?.(result.data);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            New Spare Parts Sale
          </DialogTitle>
          <DialogDescription>
            Sell vehicle spare parts from current inventory, record payments, or issue on credit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer Selection Section */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" />
                Customer Information
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="walk-in-toggle"
                  checked={isWalkIn}
                  onChange={(e) => {
                    setIsWalkIn(e.target.checked);
                    if (e.target.checked) {
                      setCustomerId("");
                      if (paymentType === "credit") setPaymentType("full");
                    }
                  }}
                  className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <Label htmlFor="walk-in-toggle" className="text-xs font-semibold cursor-pointer">
                  Walk-in Customer (Instant Counter Sale)
                </Label>
              </div>
            </div>

            {isWalkIn ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="walk-in-name" className="text-xs">
                    Customer Name (Optional)
                  </Label>
                  <Input
                    id="walk-in-name"
                    placeholder="e.g. Walk-in Customer / Driver"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="walk-in-phone" className="text-xs">
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="walk-in-phone"
                    placeholder="e.g. 080..."
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
                <div className="flex-1 w-full">
                  <Popover
                    open={customerPopoverOpen}
                    onOpenChange={setCustomerPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-10 text-left font-normal"
                      >
                        {selectedCustomer ? (
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-foreground">
                              {selectedCustomer.name}
                            </span>
                            {selectedCustomer.phone && (
                              <span className="font-mono text-xs text-muted-foreground">
                                ({selectedCustomer.phone})
                              </span>
                            )}
                            {selectedCustomer.outstandingBalance > 0 && (
                              <Badge variant="destructive" className="ml-1 text-[10px] py-0">
                                Debt: {formatCurrency(selectedCustomer.outstandingBalance)}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            Search and select a customer...
                          </span>
                        )}
                        <ChevronsUpDown className="size-4 shrink-0 opacity-50 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-2" align="start">
                      <div className="space-y-2">
                        <Input
                          placeholder="Search customer by name or phone..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                        <div className="max-h-56 overflow-y-auto space-y-1">
                          {filteredCustomers.length === 0 ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                              No customer found.
                            </div>
                          ) : (
                            filteredCustomers.map((c) => (
                              <button
                                key={c._id}
                                type="button"
                                onClick={() => {
                                  setCustomerId(c._id);
                                  setCustomerPopoverOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded text-left text-xs transition-colors hover:bg-accent ${
                                  customerId === c._id ? "bg-accent font-bold" : ""
                                }`}
                              >
                                <div>
                                  <div className="font-semibold text-foreground">
                                    {c.name}
                                  </div>
                                  {c.phone && (
                                    <div className="text-muted-foreground font-mono text-[11px]">
                                      {c.phone}
                                    </div>
                                  )}
                                </div>
                                {c.outstandingBalance > 0 && (
                                  <span className="text-[11px] font-bold text-rose-600">
                                    {formatCurrency(c.outstandingBalance)}
                                  </span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {onOpenCustomerCreate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenCustomerCreate}
                    className="gap-1 h-10 text-xs shrink-0"
                  >
                    <UserPlus className="size-3.5" />
                    <span>Quick Add</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Product Items Table */}
          <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="size-3.5 text-primary" />
                Selected Products ({items.filter((it) => it.productId).length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="gap-1 text-xs h-7 font-bold"
              >
                <Plus className="size-3.5" />
                Add Product Row
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const isSearchingThis = activeRowIdxForSearch === index;
                const hasExceededStock = item.productId && item.quantity > item.stockAvailable;

                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-3"
                  >
                    <div className="grid grid-cols-12 gap-2.5 items-end">
                      {/* Product Selector Combobox */}
                      <div className="col-span-12 sm:col-span-6">
                        <Label className="text-[11px] text-muted-foreground font-semibold">
                          Product / Spare Part #{index + 1}
                        </Label>
                        <Popover
                          open={isSearchingThis}
                          onOpenChange={(op) => {
                            if (!op) setActiveRowIdxForSearch(null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              onClick={() => setActiveRowIdxForSearch(index)}
                              className="w-full justify-between h-9 text-xs font-normal text-left truncate mt-1"
                            >
                              {item.productId ? (
                                <span className="font-semibold text-foreground truncate">
                                  {item.productName}
                                  {item.partNumber ? ` (${item.partNumber})` : ""}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Click to select product...
                                </span>
                              )}
                              <ChevronsUpDown className="size-3.5 shrink-0 opacity-50 ml-1" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[360px] p-2" align="start">
                            <div className="space-y-2">
                              <Input
                                placeholder="Search by name, part #, brand..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="h-8 text-xs"
                                autoFocus
                              />
                              <div className="max-h-56 overflow-y-auto space-y-1">
                                {filteredProducts.length === 0 ? (
                                  <div className="py-4 text-center text-xs text-muted-foreground">
                                    No products found.
                                  </div>
                                ) : (
                                  filteredProducts.map((p) => {
                                    const outOfStock = p.quantityOnHand <= 0;
                                    return (
                                      <button
                                        key={p._id}
                                        type="button"
                                        disabled={outOfStock}
                                        onClick={() => handleSelectProduct(index, p)}
                                        className={`w-full flex items-center justify-between p-2 rounded text-left text-xs transition-colors hover:bg-accent ${
                                          outOfStock ? "opacity-40 cursor-not-allowed" : ""
                                        }`}
                                      >
                                        <div className="truncate mr-2">
                                          <div className="font-semibold text-foreground truncate">
                                            {p.name}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground font-mono">
                                            {p.partNumber || "No part #"} • {p.brand?.name || "Generic"}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className="font-mono font-bold text-foreground">
                                            {formatCurrency(p.sellingPrice)}
                                          </div>
                                          <div
                                            className={`text-[10px] font-bold ${
                                              outOfStock ? "text-red-500" : "text-emerald-600"
                                            }`}
                                          >
                                            {outOfStock ? "Out of Stock" : `${p.quantityOnHand} in stock`}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-[11px] text-muted-foreground font-semibold">
                            Qty
                          </Label>
                          {item.productId && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Stock: {item.stockAvailable}
                            </span>
                          )}
                        </div>
                        <Input
                          type="number"
                          min="1"
                          max={item.stockAvailable > 0 ? item.stockAvailable : undefined}
                          value={item.quantity}
                          onChange={(e) =>
                            updateRow(index, { quantity: parseInt(e.target.value) || 1 })
                          }
                          className={`h-9 text-xs font-bold mt-1 ${
                            hasExceededStock ? "border-destructive focus-visible:ring-destructive" : ""
                          }`}
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-[11px] text-muted-foreground font-semibold">
                          Unit Price (₦)
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateRow(index, { unitPrice: parseFloat(e.target.value) || 0 })
                          }
                          className="h-9 text-xs font-mono font-semibold mt-1"
                        />
                      </div>

                      {/* Line Total & Remove */}
                      <div className="col-span-4 sm:col-span-2 flex items-center justify-between gap-1">
                        <div className="w-full">
                          <Label className="text-[11px] text-muted-foreground font-semibold">
                            Total (₦)
                          </Label>
                          <div className="h-9 mt-1 px-2.5 rounded-md border border-border/50 bg-background flex items-center font-mono font-bold text-xs text-foreground truncate">
                            {formatCurrency(item.lineTotal)}
                          </div>
                        </div>

                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(index)}
                            className="size-8 p-0 text-destructive hover:bg-destructive/10 shrink-0 mt-5"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {hasExceededStock && (
                      <div className="text-[11px] text-destructive font-semibold flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        <span>Quantity exceeds available stock of {item.stockAvailable} units!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals, Discount & Payment Strategy */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Details */}
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-primary" />
                Payment Options
              </span>

              <div className="space-y-1.5">
                <Label className="text-xs">Payment Terms</Label>
                <Select
                  value={paymentType}
                  onValueChange={(val: any) => {
                    setPaymentType(val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue placeholder="Choose payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Payment (Paid in full)</SelectItem>
                    <SelectItem value="partial" disabled={isWalkIn}>
                      Partial Payment (Deposit + Credit)
                    </SelectItem>
                    <SelectItem value="credit" disabled={isWalkIn}>
                      Unpaid Credit Sale (Full debt)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isWalkIn && (
                  <span className="text-[10px] text-muted-foreground">
                    * Credit sales require selecting a registered customer.
                  </span>
                )}
              </div>

              {paymentType === "partial" && (
                <div className="space-y-1.5">
                  <Label htmlFor="initial-pay" className="text-xs">
                    Deposit / Cash Received Now (₦)
                  </Label>
                  <Input
                    id="initial-pay"
                    type="number"
                    step="any"
                    min="0"
                    max={totalAmount}
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(e.target.value)}
                    className="h-9 text-sm font-bold font-mono"
                  />
                </div>
              )}

              {paymentType !== "credit" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="pos">POS</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Reference (Optional)</Label>
                    <Input
                      placeholder="e.g. POS ref"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sale Date</Label>
                  <Input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Remarks / Notes</Label>
                  <Input
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4 flex flex-col justify-between space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sale Summary & Balance
              </span>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-xs">Discount (₦):</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max={subtotal}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-28 h-8 text-xs font-mono font-bold text-right"
                  />
                </div>

                <div className="flex justify-between text-base font-black border-t border-border/70 pt-2 text-foreground">
                  <span>Net Sale Total:</span>
                  <span className="font-mono text-primary text-lg">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Amount Paid Today:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(numInitialPayment)}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-bold border-t border-dashed border-border/70 pt-2">
                  <span className={balance > 0 ? "text-rose-600" : "text-foreground"}>
                    Remaining Balance (Debt):
                  </span>
                  <span
                    className={`font-mono font-black ${
                      balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"
                    }`}
                  >
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Badge
                  variant={balance === 0 ? "default" : numInitialPayment > 0 ? "secondary" : "destructive"}
                  className="w-full justify-center py-1 uppercase text-[11px] font-bold tracking-wider"
                >
                  {balance === 0 ? "Full Payment Sale" : numInitialPayment > 0 ? "Partial Payment Sale" : "Credit Sale"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || totalAmount <= 0}
              className="gap-2 font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Receipt className="size-4" />
              )}
              Confirm & Post Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
