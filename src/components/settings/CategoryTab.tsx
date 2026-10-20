"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CategoryWithCounts,
} from "@/actions/categoryActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Tags,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

export default function CategoryTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCounts | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: categories = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => await getCategories(),
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setModalOpen(true);
  };

  const handleOpenEdit = (category: CategoryWithCounts) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        const res = await updateCategory(editingCategory._id, {
          name: name.trim(),
          description: description.trim(),
        });
        if (!res.success) {
          toast.error(res.error || "Failed to update category.");
          return;
        }
        toast.success(`Category "${name}" updated successfully!`);
      } else {
        const res = await createCategory({
          name: name.trim(),
          description: description.trim(),
        });
        if (!res.success) {
          toast.error(res.error || "Failed to create category.");
          return;
        }
        toast.success(`Category "${name}" created successfully!`);
      }

      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModalOpen(false);
    } catch {
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setDeleting(true);
    try {
      const res = await deleteCategory(deletingCategory._id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete category.");
        return;
      }
      toast.success(`Category "${deletingCategory.name}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteOpen(false);
    } catch {
      toast.error("An error occurred during deletion.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
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
              toast.success("Categories refreshed");
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold">Category Name</TableHead>
              <TableHead className="font-bold">Description</TableHead>
              <TableHead className="font-bold text-center">Attributes</TableHead>
              <TableHead className="font-bold text-center">Assigned Products</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span>Loading categories...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2 py-4">
                    <Tags className="size-8 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">No categories found</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Create categories such as Tyres, Brake Pads, Batteries, or Sprockets to organize parts.
                    </p>
                    <Button onClick={handleOpenCreate} size="sm" variant="outline" className="mt-1">
                      <Plus className="size-3.5 mr-1" /> Add Category
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Tags className="size-4 text-primary" />
                      <span>{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {category.description || <span className="italic text-muted-foreground/60">No description</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={category.attributeCount > 0 ? "brand" : "secondary"}>
                      {category.attributeCount} {category.attributeCount === 1 ? "spec" : "specs"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-mono">
                      {category.productCount} parts
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(category)}
                        className="h-8 w-8 p-0 hover:text-primary"
                        title="Edit Category"
                      >
                        <Edit2 className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingCategory(category);
                          setDeleteOpen(true);
                        }}
                        className="h-8 w-8 p-0 hover:text-destructive text-muted-foreground"
                        title="Delete Category"
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

      {/* Add / Edit Category Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="size-5 text-primary" />
              {editingCategory ? "Edit Category" : "Add Product Category"}
            </DialogTitle>
            <DialogDescription>
              Categories classify vehicle spare parts (e.g. Tyres, Sprockets, Batteries).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category-name"
                placeholder="e.g. Tyre, Brake Pad, Battery, Sprocket"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-desc">Description (Optional)</Label>
              <Textarea
                id="category-desc"
                placeholder="Describe what parts belong to this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
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
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Category"
        description={
          deletingCategory
            ? `Are you sure you want to delete category "${deletingCategory.name}"? This operation will be rejected if products or custom attribute definitions are associated with it.`
            : ""
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
