"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  BrandWithCount,
} from "@/actions/brandActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plus,
  Edit2,
  Trash2,
  Award,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

export default function BrandTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandWithCount | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState<BrandWithCount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: brands = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["product-brands"],
    queryFn: async () => await getBrands(),
  });

  const handleOpenCreate = () => {
    setEditingBrand(null);
    setName("");
    setModalOpen(true);
  };

  const handleOpenEdit = (brand: BrandWithCount) => {
    setEditingBrand(brand);
    setName(brand.name);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Brand name is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingBrand) {
        const res = await updateBrand(editingBrand._id, {
          name: name.trim(),
        });
        if (!res.success) {
          toast.error(res.error || "Failed to update brand.");
          return;
        }
        toast.success(`Brand "${name}" updated successfully!`);
      } else {
        const res = await createBrand({
          name: name.trim(),
        });
        if (!res.success) {
          toast.error(res.error || "Failed to create brand.");
          return;
        }
        toast.success(`Brand "${name}" created successfully!`);
      }

      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModalOpen(false);
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBrand) return;
    setDeleting(true);
    try {
      const res = await deleteBrand(deletingBrand._id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete brand.");
        return;
      }
      toast.success(`Brand "${deletingBrand.name}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteOpen(false);
    } catch {
      toast.error("An error occurred during deletion.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredBrands = brands.filter((b) => {
    if (!search.trim()) return true;
    return b.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Brands refreshed");
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Add Brand
          </Button>
        </div>
      </div>

      {/* Brands Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold">Brand Name</TableHead>
              <TableHead className="font-bold text-center">Associated Parts</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span>Loading brands...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Award className="size-8 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">No brands found</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Add manufacturer or aftermarket brands such as Maxxis, Bosch, NGK, Dunlop, or Exide.
                    </p>
                    <Button onClick={handleOpenCreate} size="sm" variant="outline" className="mt-1">
                      <Plus className="size-3.5 mr-1" /> Add Brand
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((brand) => (
                <TableRow key={brand._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-primary" />
                      <span>{brand.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {brand.productCount} parts
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(brand)}
                        className="h-8 w-8 p-0 hover:text-primary"
                        title="Edit Brand"
                      >
                        <Edit2 className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingBrand(brand);
                          setDeleteOpen(true);
                        }}
                        className="h-8 w-8 p-0 hover:text-destructive text-muted-foreground"
                        title="Delete Brand"
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

      {/* Add / Edit Brand Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="size-5 text-primary" />
              {editingBrand ? "Edit Brand" : "Add Product Brand"}
            </DialogTitle>
            <DialogDescription>
              Manufacturer or aftermarket brand (e.g. Bosch, Maxxis, NGK, Exide).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="brand-name">
                Brand Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand-name"
                placeholder="e.g. Maxxis, NGK, Bosch, KMC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
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
                {editingBrand ? "Save Changes" : "Create Brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Brand"
        description={
          deletingBrand
            ? `Are you sure you want to delete brand "${deletingBrand.name}"? This operation will be rejected if any products are associated with it.`
            : ""
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
