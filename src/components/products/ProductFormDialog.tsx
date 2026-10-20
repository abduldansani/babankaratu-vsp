"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "@/actions/categoryActions";
import { getBrands } from "@/actions/brandActions";
import { getVehicleMakes, getVehicleModels } from "@/actions/vehicleActions";
import { getAttributeDefinitions } from "@/actions/attributeActions";
import {
  createProduct,
  updateProduct,
  ProductViewItem,
} from "@/actions/productActions";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Trash2,
  X,
  Loader2,
  Check,
  Bike,
  Sliders,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { AttributeType } from "@/models/ProductAttributeDefinition";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToEdit?: ProductViewItem | null;
  onSaved?: () => void;
}

interface FitmentRow {
  model: string;
  modelName: string;
  makeName: string;
  yearFrom?: number;
  yearTo?: number;
  notes?: string;
}

interface AttributeDefinitionItem {
  _id: string;
  name: string;
  key: string;
  type: AttributeType;
  required: boolean;
  options: string[];
  unit?: string;
  displayOrder: number;
}

export default function ProductFormDialog({
  open,
  onOpenChange,
  productToEdit,
  onSaved,
}: ProductFormDialogProps) {
  const queryClient = useQueryClient();

  // Basic Info
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");

  // Pricing & Stock
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantityOnHand, setQuantityOnHand] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("5");

  // Dynamic attributes state: { [key: string]: any }
  const [dynamicAttributes, setDynamicAttributes] = useState<
    Record<string, any>
  >({});

  // Fitments
  const [fitments, setFitments] = useState<FitmentRow[]>([]);
  const [fitmentMakeId, setFitmentMakeId] = useState("");
  const [fitmentModelId, setFitmentModelId] = useState("");
  const [fitmentYearFrom, setFitmentYearFrom] = useState("");
  const [fitmentYearTo, setFitmentYearTo] = useState("");
  const [fitmentNotes, setFitmentNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch Categories & Brands
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => await getCategories(),
    enabled: open,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["product-brands"],
    queryFn: async () => await getBrands(),
    enabled: open,
  });

  // Fetch Vehicle Makes & Models for Fitment Selector
  const { data: vehicleMakes = [] } = useQuery({
    queryKey: ["vehicle-makes"],
    queryFn: async () => await getVehicleMakes(),
    enabled: open,
  });

  const { data: availableModels = [] } = useQuery({
    queryKey: ["vehicle-models", fitmentMakeId],
    queryFn: async () => {
      if (!fitmentMakeId) return [];
      return await getVehicleModels(fitmentMakeId);
    },
    enabled: open && Boolean(fitmentMakeId),
  });

  // Fetch dynamic attribute definitions for selected category
  const {
    data: attributeDefinitions = [],
    isLoading: attrsLoading,
  } = useQuery<AttributeDefinitionItem[]>({
    queryKey: ["category-attributes", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      return await getAttributeDefinitions(categoryId);
    },
    enabled: open && Boolean(categoryId),
  });

  // Populate form on edit mode or reset on create mode
  useEffect(() => {
    if (!open) return;

    if (productToEdit) {
      setName(productToEdit.name || "");
      setPartNumber(productToEdit.partNumber || "");
      setDescription(productToEdit.description || "");
      setCategoryId(productToEdit.category?._id || "");
      setBrandId(productToEdit.brand?._id || "");
      setCostPrice(String(productToEdit.costPrice ?? ""));
      setSellingPrice(String(productToEdit.sellingPrice ?? ""));
      setQuantityOnHand(String(productToEdit.quantityOnHand ?? 0));
      setReorderLevel(String(productToEdit.reorderLevel ?? 5));
      setDynamicAttributes(productToEdit.attributes || {});

      // Map fitments
      const mappedFitments: FitmentRow[] = (productToEdit.vehicleFitments || []).map(
        (vf) => ({
          model: vf.model?._id || "",
          modelName: vf.model?.name || "Model",
          makeName: vf.model?.make?.name || "Make",
          yearFrom: vf.yearFrom,
          yearTo: vf.yearTo,
          notes: vf.notes || "",
        })
      );
      setFitments(mappedFitments);
    } else {
      // Create mode defaults
      setName("");
      setPartNumber("");
      setDescription("");
      setCategoryId(categories.length > 0 ? categories[0]._id : "");
      setBrandId(brands.length > 0 ? brands[0]._id : "");
      setCostPrice("");
      setSellingPrice("");
      setQuantityOnHand("0");
      setReorderLevel("5");
      setDynamicAttributes({});
      setFitments([]);
    }

    setFitmentMakeId("");
    setFitmentModelId("");
    setFitmentYearFrom("");
    setFitmentYearTo("");
    setFitmentNotes("");
    setFieldErrors({});
  }, [open, productToEdit, categories, brands]);

  // Handle category change: reset attributes to avoid stale orphan keys
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    setDynamicAttributes({});
    setFieldErrors({});
  };

  // Add Fitment
  const handleAddFitment = () => {
    if (!fitmentModelId) {
      toast.error("Please select a vehicle model.");
      return;
    }

    if (fitments.some((f) => f.model === fitmentModelId)) {
      toast.error("This vehicle model is already added to fitments.");
      return;
    }

    const selectedModel = availableModels.find((m) => m._id === fitmentModelId);
    const selectedMake = vehicleMakes.find((m) => m._id === fitmentMakeId);

    setFitments([
      ...fitments,
      {
        model: fitmentModelId,
        modelName: selectedModel?.name || "Model",
        makeName: selectedMake?.name || "Make",
        yearFrom: fitmentYearFrom ? parseInt(fitmentYearFrom) : undefined,
        yearTo: fitmentYearTo ? parseInt(fitmentYearTo) : undefined,
        notes: fitmentNotes.trim() || undefined,
      },
    ]);

    // Reset fitment inputs
    setFitmentModelId("");
    setFitmentYearFrom("");
    setFitmentYearTo("");
    setFitmentNotes("");
  };

  const handleRemoveFitment = (indexToRemove: number) => {
    setFitments(fitments.filter((_, i) => i !== indexToRemove));
  };

  // Dynamic attribute value change handlers
  const handleAttrChange = (key: string, value: any) => {
    setDynamicAttributes((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleMultiSelectToggle = (key: string, option: string) => {
    const current: string[] = Array.isArray(dynamicAttributes[key])
      ? dynamicAttributes[key]
      : [];
    if (current.includes(option)) {
      handleAttrChange(
        key,
        current.filter((item) => item !== option)
      );
    } else {
      handleAttrChange(key, [...current, option]);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category.");
      return;
    }
    if (!brandId) {
      toast.error("Please select a brand.");
      return;
    }

    const costNum = parseFloat(costPrice) || 0;
    const sellNum = parseFloat(sellingPrice) || 0;
    const qohNum = parseInt(quantityOnHand) || 0;
    const reorderNum = parseInt(reorderLevel) || 0;

    const payload = {
      name: name.trim(),
      partNumber: partNumber.trim() || undefined,
      description: description.trim() || undefined,
      category: categoryId,
      brand: brandId,
      vehicleFitments: fitments.map((f) => ({
        model: f.model,
        yearFrom: f.yearFrom,
        yearTo: f.yearTo,
        notes: f.notes,
      })),
      attributes: dynamicAttributes,
      costPrice: costNum,
      sellingPrice: sellNum,
      quantityOnHand: qohNum,
      reorderLevel: reorderNum,
    };

    setSaving(true);
    try {
      if (productToEdit) {
        const res = await updateProduct(productToEdit._id, payload);
        if (!res.success) {
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          toast.error(res.error || "Failed to update product.");
          return;
        }
        toast.success(`Product "${name}" updated successfully!`);
      } else {
        const res = await createProduct(payload);
        if (!res.success) {
          if (res.fieldErrors) {
            setFieldErrors(res.fieldErrors);
          }
          toast.error(res.error || "Failed to create product.");
          return;
        }
        toast.success(`Product "${name}" created successfully!`);
      }

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch {
      toast.error("An error occurred while saving product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Package className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-black text-foreground">
                {productToEdit ? "Edit Spare Part" : "New Product Registration"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Fill in part details, dynamic specifications, and compatible vehicles.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-3">
          {/* SECTION 1: Basic Information */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <span>1. Part Identification</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="prod-name"
                  placeholder="e.g. Maxxis Heavy Duty Rear Tyre, Bosch Brake Shoe Set"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-partno">Part / Reference Number</Label>
                <Input
                  id="prod-partno"
                  placeholder="e.g. MX-300-18-HD, BSH-BRK-01"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="font-mono text-xs"
                />
                <span className="text-[10px] text-muted-foreground">
                  Optional. Used for quick searches and supplier catalog matching.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-brand">
                  Brand <span className="text-destructive">*</span>
                </Label>
                <Select value={brandId} onValueChange={(val) => setBrandId(val)}>
                  <SelectTrigger id="prod-brand">
                    <SelectValue placeholder="Select Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-category">
                  Product Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={categoryId}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger id="prod-category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">
                  Selecting a category loads its custom technical specification fields.
                </span>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-desc">Description</Label>
                <Textarea
                  id="prod-desc"
                  placeholder="Detailed notes, technical specs, or packaging notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Dynamic Category Specifications */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sliders className="size-3.5" />
                <span>2. Dynamic Category Specifications</span>
              </h4>
              {attributeDefinitions.length > 0 && (
                <Badge variant="brand" className="text-[10px]">
                  {attributeDefinitions.length} Defined
                </Badge>
              )}
            </div>

            {attrsLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Loading category specifications...</span>
              </div>
            ) : attributeDefinitions.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center">
                <p className="text-xs text-muted-foreground">
                  No custom attributes defined for this category. You can define them in{" "}
                  <strong>Product Settings &gt; Attributes</strong>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-muted/20 p-4 rounded-xl border border-border">
                {attributeDefinitions.map((attr) => {
                  const error = fieldErrors[attr.key];
                  const rawVal = dynamicAttributes[attr.key];

                  return (
                    <div
                      key={attr._id}
                      className={
                        attr.type === "multiselect"
                          ? "sm:col-span-2 space-y-1.5"
                          : "space-y-1.5"
                      }
                    >
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`attr-${attr.key}`}
                          className="text-xs font-semibold text-foreground flex items-center gap-1"
                        >
                          <span>{attr.name}</span>
                          {attr.required && (
                            <span className="text-destructive font-black">*</span>
                          )}
                          {attr.unit && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ({attr.unit})
                            </span>
                          )}
                        </Label>
                        {error && (
                          <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            {error}
                          </span>
                        )}
                      </div>

                      {/* Input based on type */}
                      {attr.type === "text" && (
                        <Input
                          id={`attr-${attr.key}`}
                          placeholder={`Enter ${attr.name.toLowerCase()}...`}
                          value={rawVal !== undefined && rawVal !== null ? String(rawVal) : ""}
                          onChange={(e) => handleAttrChange(attr.key, e.target.value)}
                          className={error ? "border-destructive" : ""}
                        />
                      )}

                      {attr.type === "number" && (
                        <div className="relative">
                          <Input
                            id={`attr-${attr.key}`}
                            type="number"
                            step="any"
                            placeholder="0"
                            value={rawVal !== undefined && rawVal !== null ? String(rawVal) : ""}
                            onChange={(e) => handleAttrChange(attr.key, e.target.value)}
                            className={error ? "border-destructive pr-10" : "pr-10"}
                          />
                          {attr.unit && (
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono font-semibold pointer-events-none">
                              {attr.unit}
                            </span>
                          )}
                        </div>
                      )}

                      {attr.type === "boolean" && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                          <span className="text-xs text-muted-foreground">
                            {rawVal ? "Enabled / Yes" : "Disabled / No"}
                          </span>
                          <Switch
                            id={`attr-${attr.key}`}
                            checked={Boolean(rawVal)}
                            onCheckedChange={(checked) => handleAttrChange(attr.key, checked)}
                          />
                        </div>
                      )}

                      {attr.type === "select" && (
                        <Select
                          value={rawVal !== undefined && rawVal !== null ? String(rawVal) : ""}
                          onValueChange={(val) => handleAttrChange(attr.key, val)}
                        >
                          <SelectTrigger
                            id={`attr-${attr.key}`}
                            className={error ? "border-destructive" : ""}
                          >
                            <SelectValue placeholder={`Select ${attr.name}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {(attr.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {attr.type === "multiselect" && (
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-border bg-card">
                          {(attr.options || []).map((opt) => {
                            const isSelected =
                              Array.isArray(rawVal) && rawVal.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleMultiSelectToggle(attr.key, opt)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                                }`}
                              >
                                {isSelected && <Check className="size-3 stroke-[3]" />}
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 3: Pricing & Inventory */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <span>3. Financials & Inventory Levels</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prod-cost">Cost Price (₦)</Label>
                <Input
                  id="prod-cost"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-sell">Selling Price (₦)</Label>
                <Input
                  id="prod-sell"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-qoh">Stock on Hand</Label>
                <Input
                  id="prod-qoh"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={quantityOnHand}
                  onChange={(e) => setQuantityOnHand(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-reorder">Reorder Alert Level</Label>
                <Input
                  id="prod-reorder"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="5"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Vehicle Compatibility (Fitments) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Bike className="size-3.5" />
                <span>4. Vehicle Compatibility (Optional)</span>
              </h4>
              <span className="text-[11px] text-muted-foreground">
                Leave empty for universal parts
              </span>
            </div>

            {/* Quick Add Fitment Row */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Filter by Make</Label>
                  <Select
                    value={fitmentMakeId}
                    onValueChange={(val) => {
                      setFitmentMakeId(val);
                      setFitmentModelId("");
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose Make..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleMakes.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Select Model</Label>
                  <Select
                    value={fitmentModelId}
                    onValueChange={(val) => setFitmentModelId(val)}
                    disabled={!fitmentMakeId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={
                          fitmentMakeId ? "Choose Model..." : "Select Make first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddFitment}
                    disabled={!fitmentModelId}
                    className="w-full h-9 text-xs gap-1 font-bold"
                  >
                    <Plus className="size-3.5" /> Add Fitment
                  </Button>
                </div>
              </div>

              {/* Optional Year and Notes for fitment */}
              {fitmentModelId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-border/40">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">From Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2015"
                      value={fitmentYearFrom}
                      onChange={(e) => setFitmentYearFrom(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">To Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2024"
                      value={fitmentYearTo}
                      onChange={(e) => setFitmentYearTo(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Fitment Note</Label>
                    <Input
                      placeholder="e.g. Rear drum only"
                      value={fitmentNotes}
                      onChange={(e) => setFitmentNotes(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Selected Fitments List */}
            {fitments.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {fitments.map((fitment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold">
                        {fitment.makeName}
                      </Badge>
                      <span className="font-bold text-foreground">
                        {fitment.modelName}
                      </span>
                      {(fitment.yearFrom || fitment.yearTo) && (
                        <span className="text-muted-foreground font-mono text-[11px]">
                          ({fitment.yearFrom || "*"} - {fitment.yearTo || "Present"})
                        </span>
                      )}
                      {fitment.notes && (
                        <span className="italic text-muted-foreground text-[11px]">
                          — {fitment.notes}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFitment(idx)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic px-1">
                No vehicles assigned. This part will be marked as Universal Compatibility.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {productToEdit ? "Update Product" : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
