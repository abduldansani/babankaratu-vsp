"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "@/actions/categoryActions";
import {
  getAttributeDefinitions,
  createAttributeDefinition,
  updateAttributeDefinition,
  deleteAttributeDefinition,
} from "@/actions/attributeActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import DeleteConfirmDialog from "@/components/products/DeleteConfirmDialog";
import { toast } from "sonner";
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  X,
  Info,
  Loader2,
  Layers,
  Sparkles,
} from "lucide-react";
import { AttributeType } from "@/models/ProductAttributeDefinition";

export interface AttributeItem {
  _id: string;
  name: string;
  key: string;
  category: string;
  type: AttributeType;
  required: boolean;
  options: string[];
  unit?: string;
  displayOrder: number;
}

export default function AttributeTab() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<AttributeItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<AttributeType>("text");
  const [required, setRequired] = useState(false);
  const [unit, setUnit] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [options, setOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAttr, setDeletingAttr] = useState<AttributeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => await getCategories(),
  });

  // Effective category ID (fall back to first category if none selected)
  const activeCategoryId =
    selectedCategory || (categories.length > 0 ? categories[0]._id : "");

  // Fetch attributes for active category
  const {
    data: attributes = [],
    isLoading: attrsLoading,
    refetch,
    isRefetching,
  } = useQuery<AttributeItem[]>({
    queryKey: ["category-attributes", activeCategoryId],
    queryFn: async () => {
      if (!activeCategoryId) return [];
      return await getAttributeDefinitions(activeCategoryId);
    },
    enabled: Boolean(activeCategoryId),
  });

  const activeCategoryObj = categories.find((c) => c._id === activeCategoryId);

  // Auto-slugify key from name when creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingAttr) {
      const slug = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/^_+|_+$/g, "");
      setKey(slug);
    }
  };

  const handleOpenCreate = () => {
    if (!activeCategoryId) {
      toast.error("Please create a category first before defining attributes.");
      return;
    }
    setEditingAttr(null);
    setName("");
    setKey("");
    setType("text");
    setRequired(false);
    setUnit("");
    setDisplayOrder(String((attributes.length + 1) * 10));
    setOptions([]);
    setNewOptionInput("");
    setModalOpen(true);
  };

  const handleOpenEdit = (attr: AttributeItem) => {
    setEditingAttr(attr);
    setName(attr.name);
    setKey(attr.key);
    setType(attr.type);
    setRequired(attr.required);
    setUnit(attr.unit || "");
    setDisplayOrder(String(attr.displayOrder || 0));
    setOptions(attr.options || []);
    setNewOptionInput("");
    setModalOpen(true);
  };

  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (options.includes(trimmed)) {
      toast.error("Option already exists.");
      return;
    }
    setOptions([...options, trimmed]);
    setNewOptionInput("");
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setOptions(options.filter((_, i) => i !== indexToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Attribute label is required.");
      return;
    }
    if (!key.trim()) {
      toast.error("Machine-readable key is required.");
      return;
    }

    if ((type === "select" || type === "multiselect") && options.length === 0) {
      toast.error("Please add at least one allowed option for select / multiselect.");
      return;
    }

    setSaving(true);
    try {
      if (editingAttr) {
        const res = await updateAttributeDefinition(editingAttr._id, {
          name: name.trim(),
          type,
          required,
          options,
          unit: unit.trim(),
          displayOrder: parseInt(displayOrder) || 0,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to update attribute.");
          return;
        }
        toast.success(`Attribute "${name}" updated!`);
      } else {
        const res = await createAttributeDefinition({
          name: name.trim(),
          key: key.trim(),
          category: activeCategoryId,
          type,
          required,
          options,
          unit: unit.trim(),
          displayOrder: parseInt(displayOrder) || 0,
        });

        if (!res.success) {
          toast.error(res.error || "Failed to create attribute.");
          return;
        }
        toast.success(`Attribute "${name}" created for ${activeCategoryObj?.name}!`);
      }

      queryClient.invalidateQueries({
        queryKey: ["category-attributes", activeCategoryId],
      });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      setModalOpen(false);
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAttr) return;
    setDeleting(true);
    try {
      const res = await deleteAttributeDefinition(deletingAttr._id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete attribute.");
        return;
      }
      toast.success(`Attribute "${deletingAttr.name}" removed.`);
      queryClient.invalidateQueries({
        queryKey: ["category-attributes", activeCategoryId],
      });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      setDeleteOpen(false);
    } catch {
      toast.error("Error deleting attribute.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Category selector banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              Dynamic Category Specifications
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Attribute definitions dynamically transform into custom form fields whenever a product in that category is created or edited.
          </p>
        </div>

        {/* Category Picker */}
        <div className="flex items-center gap-2.5 min-w-[240px]">
          <Label htmlFor="category-select" className="text-xs font-semibold shrink-0">
            Select Category:
          </Label>
          <Select
            value={activeCategoryId}
            onValueChange={(val) => setSelectedCategory(val)}
          >
            <SelectTrigger id="category-select" className="w-full bg-card">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name} ({c.attributeCount || 0} specs)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <span>{activeCategoryObj?.name || "Category"} Attributes</span>
            <Badge variant="brand">{attributes.length} Defined</Badge>
          </h2>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          disabled={!activeCategoryId}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Add Attribute
        </Button>
      </div>

      {/* Attributes Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold">Attribute Label</TableHead>
              <TableHead className="font-bold">Key</TableHead>
              <TableHead className="font-bold">Type</TableHead>
              <TableHead className="font-bold text-center">Required</TableHead>
              <TableHead className="font-bold">Unit</TableHead>
              <TableHead className="font-bold">Options / Configuration</TableHead>
              <TableHead className="font-bold text-center">Order</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attrsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span>Loading specifications...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : !activeCategoryId ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <p>Please select or create a category first.</p>
                </TableCell>
              </TableRow>
            ) : attributes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Sliders className="size-8 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">
                      No attributes defined for {activeCategoryObj?.name}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Add specifications such as Size, Position, Number of Teeth, or Voltage to capture technical details for this category.
                    </p>
                    <Button onClick={handleOpenCreate} size="sm" variant="outline" className="mt-1">
                      <Plus className="size-3.5 mr-1" /> Add First Attribute
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              attributes.map((attr) => (
                <TableRow key={attr._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-semibold text-foreground">
                    {attr.name}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono text-primary">
                      {attr.key}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {attr.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {attr.required ? (
                      <Badge variant="destructive" className="text-[10px] uppercase">
                        Required
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Optional</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {attr.unit ? attr.unit : "—"}
                  </TableCell>
                  <TableCell>
                    {attr.options && attr.options.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {attr.options.map((opt, i) => (
                          <span
                            key={i}
                            className="inline-block text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None (Free input)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {attr.displayOrder}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(attr)}
                        className="h-8 w-8 p-0 hover:text-primary"
                        title="Edit Attribute"
                      >
                        <Edit2 className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingAttr(attr);
                          setDeleteOpen(true);
                        }}
                        className="h-8 w-8 p-0 hover:text-destructive text-muted-foreground"
                        title="Delete Attribute"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Attribute Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="size-5 text-primary" />
              {editingAttr ? "Edit Attribute Definition" : "Add Category Attribute"}
            </DialogTitle>
            <DialogDescription>
              Define specification fields for products in{" "}
              <strong>{activeCategoryObj?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="attr-name">
                  Attribute Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="attr-name"
                  placeholder="e.g. Size, Voltage, Number of Teeth"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attr-key">
                  Machine Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="attr-key"
                  placeholder="e.g. size, voltage, teeth"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  disabled={Boolean(editingAttr)}
                  className="font-mono text-xs"
                  required
                />
                <span className="text-[10px] text-muted-foreground">
                  {editingAttr ? "Stable key cannot be changed after creation." : "Letters, numbers, and underscores only."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="attr-type">
                  Field Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={type}
                  onValueChange={(val: AttributeType) => setType(val)}
                >
                  <SelectTrigger id="attr-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text (e.g. 3.00-18)</SelectItem>
                    <SelectItem value="number">Number (e.g. 12, 42)</SelectItem>
                    <SelectItem value="boolean">Boolean (Yes / No toggle)</SelectItem>
                    <SelectItem value="select">Select (Single choice)</SelectItem>
                    <SelectItem value="multiselect">Multi-Select (Multiple choices)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attr-unit">Display Unit (Optional)</Label>
                <Input
                  id="attr-unit"
                  placeholder="e.g. mm, inches, V, Ah, teeth"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>

            {/* Options manager for Select and MultiSelect */}
            {(type === "select" || type === "multiselect") && (
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Allowed Options <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {options.length} options defined
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type an option and press Add (e.g. Front)"
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddOption}
                    className="shrink-0"
                  >
                    + Add
                  </Button>
                </div>

                {options.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {options.map((opt, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-card border border-border shadow-2xs"
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="hover:text-destructive text-muted-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-destructive font-medium">
                    At least one option is required.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="attr-required" className="text-xs font-semibold cursor-pointer">
                    Mandatory Field
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Required when saving products
                  </p>
                </div>
                <Switch
                  id="attr-required"
                  checked={required}
                  onCheckedChange={setRequired}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="attr-order" className="text-xs font-semibold">
                  Display Order
                </Label>
                <Input
                  id="attr-order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editingAttr ? "Save Specification" : "Add Specification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Attribute Definition"
        description={
          deletingAttr
            ? `Are you sure you want to delete the "${deletingAttr.name}" attribute? It will be safely blocked if any existing products currently have values stored for it.`
            : ""
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
