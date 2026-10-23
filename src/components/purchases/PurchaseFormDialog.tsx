"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isValid, isAfter, startOfDay } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { getSuppliers } from "@/actions/supplierActions";
import {
  getProducts,
  ProductViewItem,
  PopulatedVehicleFitment,
} from "@/actions/productActions";
import {
  createPurchase,
  updatePurchase,
  getPurchaseById,
} from "@/actions/purchaseActions";
import { UpdatePurchaseInput } from "@/lib/validations/purchase";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  Plus,
  Trash2,
  Loader2,
  PackageCheck,
  FileEdit,
  Search,
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  Building2,
  Phone,
  Tag,
  Car,
  X,
  Layers,
  Sparkles,
  Info,
  AlertTriangle,
  Pencil,
} from "lucide-react";

interface PurchaseItemRow {
  productId: string;
  productName: string;
  partNumber?: string;
  brandName?: string;
  categoryName?: string;
  attributes?: Record<string, unknown>;
  vehicleFitments?: PopulatedVehicleFitment[];
  currentStock: number;
  currentCost: number;
  quantity: number;
  unitCost: number;
}

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedSupplierId?: string;
  purchaseIdToEdit?: string | null;
  purchaseToEdit?: any | null;
}

export default function PurchaseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedSupplierId,
  purchaseIdToEdit,
  purchaseToEdit,
}: PurchaseFormDialogProps) {
  const queryClient = useQueryClient();

  // If purchaseIdToEdit is given but purchaseToEdit is not, fetch it
  const { data: fetchedPurchase, isLoading: loadingPurchaseDetails } = useQuery({
    queryKey: ["purchase-edit-details", purchaseIdToEdit],
    queryFn: async () =>
      purchaseIdToEdit ? await getPurchaseById(purchaseIdToEdit) : null,
    enabled: open && !!purchaseIdToEdit && !purchaseToEdit,
  });

  const activePurchase = purchaseToEdit || fetchedPurchase;
  const isEditing = Boolean(activePurchase);
  const isEditingPosted = isEditing && activePurchase?.status === "posted";

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);

  // Date State with shadcn calendar
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Line items state
  const [items, setItems] = useState<PurchaseItemRow[]>([]);
  const [transport, setTransport] = useState("0");
  const [notes, setNotes] = useState("");
  const [postImmediately, setPostImmediately] = useState(true);
  const [initialPayment, setInitialPayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bank_transfer" | "cheque" | "pos" | "other"
  >("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Product Search state for adding items
  const [productSearch, setProductSearch] = useState("");
  const [partPickerOpen, setPartPickerOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] =
    useState<ProductViewItem | null>(null);
  const [addQty, setAddQty] = useState("1");
  const [addCost, setAddCost] = useState("");

  // Fetch active suppliers
  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: ["active-suppliers-list"],
    queryFn: async () => await getSuppliers({ isActive: true, limit: 100 }),
    enabled: open,
  });
  const suppliers = suppliersData?.items || [];

  // Filter suppliers by search query
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s._id === supplierId),
    [suppliers, supplierId]
  );

  // Search products for item addition
  const { data: productsData, isLoading: searchingProducts } = useQuery({
    queryKey: ["products-for-purchase", productSearch],
    queryFn: async () =>
      await getProducts({
        search: productSearch,
        limit: 30,
      }),
    enabled: open,
  });
  const availableProducts = productsData?.items || [];

  // Reset or Populate form on open / activePurchase change
  useEffect(() => {
    if (open) {
      if (activePurchase) {
        // Populating Edit State
        const sId =
          activePurchase.supplierId?._id ||
          (typeof activePurchase.supplierId === "string"
            ? activePurchase.supplierId
            : "");
        setSupplierId(sId);

        const dateObj = activePurchase.purchaseDate
          ? new Date(activePurchase.purchaseDate)
          : new Date();
        setSelectedDate(dateObj);
        setPurchaseDate(format(dateObj, "yyyy-MM-dd"));

        setTransport(String(activePurchase.transport || 0));
        setNotes(activePurchase.notes || "");
        setPostImmediately(activePurchase.status === "posted");
        setInitialPayment("0");
        setPaymentReference("");

        // Populate items
        const mappedItems: PurchaseItemRow[] = (
          activePurchase.items || []
        ).map((it: any) => ({
          productId: it.product?._id
            ? String(it.product._id)
            : String(it.product),
          productName: it.productName || it.product?.name || "Spare Part",
          partNumber: it.partNumber || it.product?.partNumber,
          currentStock: it.product?.quantityOnHand ?? 0,
          currentCost: it.product?.costPrice
            ? typeof it.product.costPrice.toString === "function"
              ? parseFloat(it.product.costPrice.toString())
              : Number(it.product.costPrice)
            : it.unitCost,
          quantity: it.quantity,
          unitCost: it.unitCost,
          attributes: it.product?.attributes,
          brandName: it.product?.brand?.name,
          categoryName: it.product?.category?.name,
          vehicleFitments: it.product?.vehicleFitments,
        }));
        setItems(mappedItems);
      } else {
        // Creating fresh purchase
        const today = new Date();
        setSelectedDate(today);
        setPurchaseDate(format(today, "yyyy-MM-dd"));

        if (preselectedSupplierId) {
          setSupplierId(preselectedSupplierId);
        } else {
          setSupplierId("");
        }
        setItems([]);
        setTransport("0");
        setNotes("");
        setPostImmediately(true);
        setInitialPayment("0");
        setPaymentMethod("bank_transfer");
        setPaymentReference("");
      }

      setSupplierSearch("");
      setSupplierPopoverOpen(false);
      setDatePopoverOpen(false);
      setProductSearch("");
      setPartPickerOpen(false);
      setSelectedProductToAdd(null);
      setAddQty("1");
      setAddCost("");
    }
  }, [open, preselectedSupplierId, activePurchase]);

  // Handle product selection in add row
  const handleSelectProduct = (product: ProductViewItem) => {
    setSelectedProductToAdd(product);
    setAddCost(String(product.costPrice || 0));
    setAddQty("1");
    setPartPickerOpen(false);
  };

  const handleAddItem = () => {
    if (!selectedProductToAdd) {
      toast.error("Please search and select a spare part first");
      return;
    }
    const qty = parseInt(addQty, 10);
    const cost = parseFloat(addCost);

    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      toast.error("Unit cost cannot be negative");
      return;
    }

    // Check if item already exists in line items
    const existingIndex = items.findIndex(
      (i) => i.productId === selectedProductToAdd._id
    );

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].unitCost = cost;
      setItems(updated);
      toast.info(`Updated quantity for ${selectedProductToAdd.name}`);
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: selectedProductToAdd._id,
          productName: selectedProductToAdd.name,
          partNumber: selectedProductToAdd.partNumber,
          brandName: selectedProductToAdd.brand?.name,
          categoryName: selectedProductToAdd.category?.name,
          attributes: selectedProductToAdd.attributes,
          vehicleFitments: selectedProductToAdd.vehicleFitments,
          currentStock: selectedProductToAdd.quantityOnHand,
          currentCost: selectedProductToAdd.costPrice,
          quantity: qty,
          unitCost: cost,
        },
      ]);
      toast.success(`Added ${selectedProductToAdd.name} to order`);
    }

    // Reset picker
    setSelectedProductToAdd(null);
    setProductSearch("");
    setAddQty("1");
    setAddCost("");
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleUpdateItemCost = (index: number, newCost: number) => {
    if (newCost < 0) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[index].unitCost = newCost;
      return updated;
    });
  };

  // Computations
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );
  const transportVal = parseFloat(transport) || 0;
  const grandTotal = subtotal + transportVal;
  const initialPayVal = parseFloat(initialPayment) || 0;
  const alreadyPaid = Number(activePurchase?.paid || 0);
  const remainingBalance = isEditingPosted
    ? Math.max(0, grandTotal - alreadyPaid)
    : Math.max(0, grandTotal - initialPayVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one spare part line item");
      return;
    }

    if (!isEditing && initialPayVal > grandTotal) {
      toast.error("Initial payment cannot exceed the invoice grand total");
      return;
    }

    if (isEditingPosted && grandTotal < alreadyPaid) {
      toast.error(
        `Invoice total (${formatCurrency(
          grandTotal
        )}) cannot be lower than the amount already paid (${formatCurrency(
          alreadyPaid
        )}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        // UPDATE EXISTING PURCHASE
        const payload: UpdatePurchaseInput = {
          supplierId,
          purchaseDate: purchaseDate || new Date().toISOString(),
          items: items.map((i) => ({
            product: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
          transport: transportVal,
          notes: notes.trim() || undefined,
          postImmediately: activePurchase.status === "draft" && postImmediately,
        };

        const res = await updatePurchase(activePurchase._id, payload);

        if (res.success) {
          toast.success(
            isEditingPosted
              ? `Purchase ${res.data?.purchaseNumber} updated! Stock inventory and balances recalculated.`
              : `Draft purchase ${res.data?.purchaseNumber} updated successfully.`
          );

          queryClient.invalidateQueries({ queryKey: ["purchases"] });
          queryClient.invalidateQueries({
            queryKey: ["purchase", activePurchase._id],
          });
          queryClient.invalidateQueries({ queryKey: ["products"] });
          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
          queryClient.invalidateQueries({ queryKey: ["profit-overview"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });

          onSuccess?.();
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to update purchase order");
        }
      } else {
        // CREATE NEW PURCHASE
        const payload = {
          supplierId,
          purchaseDate: purchaseDate || new Date().toISOString(),
          items: items.map((i) => ({
            product: i.productId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
          transport: transportVal,
          notes: notes.trim() || undefined,
          status: postImmediately ? ("posted" as const) : ("draft" as const),
          initialPayment: postImmediately ? initialPayVal : 0,
          paymentMethod: postImmediately ? paymentMethod : "cash",
          paymentReference:
            postImmediately && paymentReference.trim()
              ? paymentReference.trim()
              : undefined,
        };

        const res = await createPurchase(payload);

        if (res.success) {
          toast.success(
            postImmediately
              ? `Purchase ${res.data?.purchaseNumber} posted! Stock updated.`
              : `Purchase draft ${res.data?.purchaseNumber} saved.`
          );

          queryClient.invalidateQueries({ queryKey: ["purchases"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
          queryClient.invalidateQueries({ queryKey: ["profit-overview"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });

          onSuccess?.();
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to create purchase order");
        }
      }
    } catch {
      toast.error("An unexpected error occurred while saving the purchase");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/70 pb-3">
          <DialogTitle className="flex items-center gap-2 text-foreground font-black text-xl">
            {isEditing ? (
              <Pencil className="size-5 text-primary" />
            ) : (
              <ShoppingBag className="size-5 text-primary" />
            )}
            {isEditing
              ? `Edit Purchase Order (${activePurchase?.purchaseNumber || "..."})`
              : "New Purchase Order & Stock Acquisition"}
          </DialogTitle>
          <DialogDescription>
            {isEditingPosted
              ? "Modify vendor, line items, costs, or freight fees. Warehouse inventory stock, weighted-average costs, and supplier balances will be safely recalculated."
              : isEditing
              ? "Update draft order lines, transport, or supplier before committing to warehouse inventory."
              : "Record vendor inventory purchases, freight fees, line items, and stock receipts with weighted-average valuation."}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state if fetching details for edit */}
        {loadingPurchaseDetails ? (
          <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Loading purchase order details...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Posted Notice Banner */}
            {isEditingPosted && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Editing a Posted Purchase Order
                  </p>
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                    This order is already active in warehouse inventory. Increasing,
                    decreasing, or removing parts will automatically adjust product
                    stock levels and recompute weighted-average cost prices. Your
                    already recorded payments ({formatCurrency(alreadyPaid)})
                    remain preserved, and supplier debt balance will update accordingly.
                  </p>
                </div>
              </div>
            )}

            {/* Top Section: Searchable Supplier & Calendar Purchase Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Searchable Supplier Selection */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs flex items-center justify-between">
                  <span>
                    Select Supplier <span className="text-destructive">*</span>
                  </span>
                  {selectedSupplier && (
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {selectedSupplier.phone ||
                        selectedSupplier.contactPerson ||
                        ""}
                    </span>
                  )}
                </Label>

                <Popover
                  open={supplierPopoverOpen}
                  onOpenChange={setSupplierPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={supplierPopoverOpen}
                      className={cn(
                        "w-full h-10 justify-between text-left font-normal rounded-xl border-input bg-card px-3",
                        !selectedSupplier && "text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="size-4 shrink-0 text-primary" />
                        {selectedSupplier ? (
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-foreground truncate">
                              {selectedSupplier.name}
                            </span>
                            {selectedSupplier.contactPerson && (
                              <span className="text-xs text-muted-foreground truncate">
                                ({selectedSupplier.contactPerson})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span>Search & select supplier...</span>
                        )}
                      </div>
                      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-[380px] p-0 z-[70]"
                    align="start"
                  >
                    <div className="p-2 border-b border-border/70 flex items-center gap-2 bg-muted/20">
                      <Search className="size-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Type supplier name, contact, phone..."
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xs px-1"
                        autoFocus
                      />
                      {supplierSearch && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setSupplierSearch("")}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-border/40 p-1">
                      {loadingSuppliers ? (
                        <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="size-3.5 animate-spin" />
                          Loading registered suppliers...
                        </div>
                      ) : filteredSuppliers.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          No suppliers match &ldquo;{supplierSearch}&rdquo;
                        </div>
                      ) : (
                        filteredSuppliers.map((s) => {
                          const isSelected = s._id === supplierId;
                          return (
                            <button
                              key={s._id}
                              type="button"
                              onClick={() => {
                                setSupplierId(s._id);
                                setSupplierPopoverOpen(false);
                                setSupplierSearch("");
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors hover:bg-muted/50",
                                isSelected &&
                                  "bg-primary/10 text-primary font-medium"
                              )}
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                  {s.name}
                                  {s.outstandingBalance > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1 text-amber-600 border-amber-500/30 font-normal"
                                    >
                                      Debt: {formatCurrency(s.outstandingBalance)}
                                    </Badge>
                                  )}
                                </span>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                  {s.contactPerson && (
                                    <span>Contact: {s.contactPerson}</span>
                                  )}
                                  {s.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="size-2.5" />
                                      {s.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="size-4 text-primary shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 2. Purchase Date with Shadcn Calendar (Future dates disabled) */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs flex items-center justify-between">
                  <span>
                    Purchase / Invoice Date <span className="text-destructive">*</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Future dates disabled)
                  </span>
                </Label>

                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal rounded-xl border-input bg-card px-3",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4 text-primary" />
                      {selectedDate && isValid(selectedDate) ? (
                        <span className="font-semibold text-foreground">
                          {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </span>
                      ) : (
                        <span>Select purchase date</span>
                      )}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0 z-[70]" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setPurchaseDate(format(date, "yyyy-MM-dd"));
                          setDatePopoverOpen(false);
                        }
                      }}
                      // Disable all future dates
                      disabled={(date) =>
                        isAfter(startOfDay(date), startOfDay(new Date()))
                      }
                      autoFocus
                    />
                    <div className="p-2 border-t border-border/60 text-center bg-muted/20">
                      <span className="text-[11px] text-muted-foreground">
                        Only past dates and today can be recorded for purchases.
                      </span>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Section: Search & Select Spare Parts with Properties/Attributes */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Plus className="size-3.5 text-primary" />
                  Add Spare Part to Purchase
                </h3>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="size-3 text-primary" />
                  Search by name, part #, size, or brand
                </span>
              </div>

              {/* Searchable Part Combobox */}
              <div className="space-y-2">
                <Popover open={partPickerOpen} onOpenChange={setPartPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full h-11 justify-between text-left font-normal rounded-xl border-input bg-card px-3 shadow-xs",
                        !selectedProductToAdd && "text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Search className="size-4 shrink-0 text-primary" />
                        {selectedProductToAdd ? (
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-foreground">
                              {selectedProductToAdd.name}
                            </span>
                            {selectedProductToAdd.partNumber && (
                              <code className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                                PN: {selectedProductToAdd.partNumber}
                              </code>
                            )}
                            {selectedProductToAdd.brand?.name && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                {selectedProductToAdd.brand.name}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span>
                            Search and select spare part by name, OEM part #, size...
                          </span>
                        )}
                      </div>
                      <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    className="w-[min(650px,92vw)] p-0 z-[70]"
                    align="start"
                  >
                    {/* Search Input */}
                    <div className="p-2.5 border-b border-border/70 flex items-center gap-2 bg-muted/30">
                      <Search className="size-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Type part name, OEM number (e.g. 04465-02220), size, or description..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xs px-1"
                        autoFocus
                      />
                      {searchingProducts && (
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                      )}
                      {productSearch && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setProductSearch("")}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    {/* Results list */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-border/40 p-1">
                      {searchingProducts ? (
                        <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="size-4 animate-spin text-primary" />
                          Searching spare parts catalog...
                        </div>
                      ) : availableProducts.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">
                            No spare parts found
                          </p>
                          <p className="text-[11px]">
                            {productSearch
                              ? `No match for "${productSearch}". Check spelling or part number.`
                              : "No parts registered in the catalog yet."}
                          </p>
                        </div>
                      ) : (
                        availableProducts.map((p) => {
                          const isSelected = selectedProductToAdd?._id === p._id;
                          const attrEntries = Object.entries(p.attributes || {});

                          return (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => handleSelectProduct(p)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg flex flex-col gap-1.5 transition-colors hover:bg-muted/50",
                                isSelected && "bg-primary/10 border-primary/20"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-bold text-xs text-foreground">
                                    {p.name}
                                  </span>
                                  {p.partNumber && (
                                    <code className="ml-2 text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                      {p.partNumber}
                                    </code>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-foreground">
                                    Cost: {formatCurrency(p.costPrice)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    Stock: {p.quantityOnHand} units
                                  </span>
                                </div>
                              </div>

                              {/* Badges: Category, Brand, Attributes (Size, etc.) & Fitments */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {p.category?.name && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 font-normal bg-card"
                                  >
                                    {p.category.name}
                                  </Badge>
                                )}
                                {p.brand?.name && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 font-normal bg-card"
                                  >
                                    {p.brand.name}
                                  </Badge>
                                )}

                                {/* Part Properties: Size and custom attributes */}
                                {attrEntries.map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border/80"
                                  >
                                    <strong className="capitalize">{k}:</strong>{" "}
                                    {String(v)}
                                  </span>
                                ))}

                                {/* Vehicle Fitments */}
                                {p.vehicleFitments &&
                                  p.vehicleFitments.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Car className="size-2.5 text-primary" />
                                      {p.vehicleFitments[0].model?.name}
                                      {p.vehicleFitments.length > 1 &&
                                        ` +${p.vehicleFitments.length - 1}`}
                                    </span>
                                  )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Selected Part Properties Preview & Inputs Card */}
                {selectedProductToAdd && (
                  <div className="rounded-xl border border-primary/30 bg-card p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-primary shrink-0" />
                          <span className="font-bold text-sm text-foreground">
                            {selectedProductToAdd.name}
                          </span>
                          {selectedProductToAdd.partNumber && (
                            <code className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              PN: {selectedProductToAdd.partNumber}
                            </code>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>
                            Category:{" "}
                            <strong>
                              {selectedProductToAdd.category?.name ||
                                "Uncategorized"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Brand:{" "}
                            <strong>
                              {selectedProductToAdd.brand?.name || "Unbranded"}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProductToAdd(null)}
                        className="text-muted-foreground hover:text-foreground text-xs h-7 gap-1"
                      >
                        <X className="size-3.5" />
                        Change Part
                      </Button>
                    </div>

                    {/* Properties / Specifications Section */}
                    <div className="bg-muted/30 rounded-lg p-2.5 space-y-1.5 border border-border/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Layers className="size-3 text-primary" />
                        Part Specifications & Properties
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {Object.keys(selectedProductToAdd.attributes || {})
                          .length > 0 ? (
                          Object.entries(
                            selectedProductToAdd.attributes || {}
                          ).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center gap-1"
                            >
                              <Tag className="size-2.5 opacity-70" />
                              <strong className="capitalize">{k}:</strong>
                              <span>{String(v)}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No custom size/attributes defined on this catalog item
                            (Standard variant).
                          </span>
                        )}

                        {/* Vehicle Fitments */}
                        {selectedProductToAdd.vehicleFitments?.map((vf, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border flex items-center gap-1"
                          >
                            <Car className="size-2.5 text-primary" />
                            <span>{vf.model?.name}</span>
                            {(vf.yearFrom || vf.yearTo) && (
                              <span className="text-[10px] text-muted-foreground">
                                ({vf.yearFrom || ""}-{vf.yearTo || ""})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs pt-1 text-muted-foreground border-t border-border/40 mt-1">
                        <span>
                          Current Warehouse Stock:{" "}
                          <strong className="text-foreground">
                            {selectedProductToAdd.quantityOnHand} units
                          </strong>
                        </span>
                        <span>
                          Previous Cost:{" "}
                          <strong className="text-foreground">
                            {formatCurrency(selectedProductToAdd.costPrice)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Quantity, Cost, and Add Button */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-xs font-semibold">
                          Purchase Qty <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={addQty}
                          onChange={(e) => setAddQty(e.target.value)}
                          placeholder="Qty"
                          className="h-10 text-center font-bold"
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-xs font-semibold">
                          Unit Cost (₦) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={addCost}
                          onChange={(e) => setAddCost(e.target.value)}
                          placeholder="0.00"
                          className="h-10 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Line Total
                        </Label>
                        <div className="h-10 flex items-center px-2 bg-muted/40 rounded-lg text-xs font-black text-foreground">
                          {formatCurrency(
                            (parseInt(addQty, 10) || 0) *
                              (parseFloat(addCost) || 0)
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <Button
                          type="button"
                          onClick={handleAddItem}
                          className="w-full h-10 gap-1.5 font-bold"
                        >
                          <Plus className="size-4" />
                          Add to Order
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table of Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-xs">
                  Purchase Order Line Items ({items.length})
                </Label>
                {items.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No parts added yet
                  </span>
                )}
              </div>

              {items.length > 0 ? (
                <div className="rounded-xl border border-border/80 overflow-hidden shadow-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border/70 text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">
                          Product Name, Part # & Specifications
                        </th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        <th className="py-2.5 px-3 text-center w-24">Qty</th>
                        <th className="py-2.5 px-3 text-right w-32">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item, idx) => {
                        const itemAttrs = Object.entries(item.attributes || {});

                        return (
                          <tr key={item.productId} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-foreground">
                                {item.productName}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                {item.partNumber && (
                                  <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    PN: {item.partNumber}
                                  </code>
                                )}
                                {item.brandName && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1 font-normal"
                                  >
                                    {item.brandName}
                                  </Badge>
                                )}

                                {/* Attributes / Properties such as Size */}
                                {itemAttrs.map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border/70"
                                  >
                                    <strong className="capitalize">{k}:</strong>{" "}
                                    {String(v)}
                                  </span>
                                ))}

                                {/* Fitment */}
                                {item.vehicleFitments &&
                                  item.vehicleFitments.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Car className="size-2.5 text-primary" />
                                      {item.vehicleFitments[0].model?.name}
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center text-muted-foreground">
                              {item.currentStock} units
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Input
                                type="number"
                                min="1"
                                className="h-8 w-20 text-center mx-auto"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemQty(
                                    idx,
                                    parseInt(e.target.value, 10) || 1
                                  )
                                }
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                className="h-8 w-28 text-right ml-auto"
                                value={item.unitCost}
                                onChange={(e) =>
                                  handleUpdateItemCost(
                                    idx,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                              {formatCurrency(item.quantity * item.unitCost)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveItem(idx)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                  No spare parts added to this purchase yet. Use the picker
                  above to search and add items.
                </div>
              )}
            </div>

            {/* Transport and Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="purchase-transport" className="text-xs font-semibold">
                  Transport / Logistics / Freight (₦)
                </Label>
                <Input
                  id="purchase-transport"
                  type="number"
                  min="0"
                  step="any"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-[11px] text-muted-foreground">
                  Delivery and waybill costs added to invoice total.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="purchase-notes" className="text-xs font-semibold">
                  Notes / Waybill Number / Supplier Memo
                </Label>
                <Textarea
                  id="purchase-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Waybill #1049 via God is Good Motors"
                />
              </div>
            </div>

            {/* Financial Totals & Lifecycle Selector */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-border/60 pb-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    Items Subtotal
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    Transport Fee
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatCurrency(transportVal)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    Grand Total
                  </span>
                  <span className="text-lg font-black text-primary">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">
                    Remaining Debt
                  </span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Posting Option - only relevant when creating or editing a draft */}
              {!isEditingPosted && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      Purchase Lifecycle Status
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {postImmediately
                        ? "Posted: Immediately updates stockOnHand and weighted-average cost."
                        : "Draft: Saves order without modifying warehouse stock or liabilities."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={postImmediately ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPostImmediately(true)}
                      className="gap-1.5"
                    >
                      <PackageCheck className="size-3.5" />
                      <span>Post Immediately</span>
                    </Button>
                    <Button
                      type="button"
                      variant={!postImmediately ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPostImmediately(false);
                        setInitialPayment("0");
                      }}
                      className="gap-1.5"
                    >
                      <FileEdit className="size-3.5" />
                      <span>Save as Draft</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Initial Payment Fields (Only if Posting Immediately when Creating New) */}
              {!isEditing && postImmediately && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">
                        Initial Payment (₦)
                      </Label>
                      <button
                        type="button"
                        onClick={() => setInitialPayment(String(grandTotal))}
                        className="text-[10px] text-primary font-bold hover:underline"
                      >
                        Pay Full
                      </button>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="any"
                      value={initialPayment}
                      onChange={(e) => setInitialPayment(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {initialPayVal > 0 && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">
                          Payment Method
                        </Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={(val: any) => setPaymentMethod(val)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bank_transfer">
                              Bank Transfer
                            </SelectItem>
                            <SelectItem value="cash">Cash in Hand</SelectItem>
                            <SelectItem value="pos">POS / Card</SelectItem>
                            <SelectItem value="cheque">Bank Cheque</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">
                          Receipt / Ref #
                        </Label>
                        <Input
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="e.g. Bank Ref / Teller #"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEditing
                  ? isEditingPosted
                    ? "Update Order & Recalculate Inventory"
                    : postImmediately
                    ? "Post Draft to Inventory"
                    : "Save Draft Changes"
                  : postImmediately
                  ? "Post Purchase Order"
                  : "Save as Draft"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
