"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  deleteProduct,
  seedProductCatalog,
  ProductViewItem,
} from "@/actions/productActions";
import { getCategories } from "@/actions/categoryActions";
import { getBrands } from "@/actions/brandActions";
import { formatCurrency, formatNumber } from "@/utils/formatCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import ProductFormDialog from "@/components/products/ProductFormDialog";
import DeleteConfirmDialog from "@/components/products/DeleteConfirmDialog";
import { toast } from "sonner";
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Settings,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  Loader2,
  Bike,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  Boxes,
} from "lucide-react";

export default function ProductsPage() {
  const queryClient = useQueryClient();

  // Filters & Pagination state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductViewItem | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductViewItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Queries
  const {
    data: productsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [
      "products",
      search,
      selectedCategory,
      selectedBrand,
      selectedStockStatus,
      currentPage,
    ],
    queryFn: async () =>
      await getProducts({
        search,
        category: selectedCategory,
        brand: selectedBrand,
        stockStatus: selectedStockStatus as any,
        page: currentPage,
        limit: pageSize,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => await getCategories(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["product-brands"],
    queryFn: async () => await getBrands(),
  });

  const products = productsData?.items || [];
  const pagination = productsData?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };
  const metrics = productsData?.metrics || {
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryValue: 0,
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (product: ProductViewItem) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    try {
      const res = await deleteProduct(deletingProduct._id);
      if (!res.success) {
        toast.error(res.error || "Failed to delete product.");
        return;
      }
      toast.success(`Product "${deletingProduct.name}" removed.`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setDeleteOpen(false);
    } catch {
      toast.error("Error during product deletion.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedProductCatalog();
      if (res.success) {
        toast.success(String(res.data || "Catalog seeded successfully!"));
        queryClient.invalidateQueries();
      } else {
        toast.info(res.error || "Catalog already contains records.");
      }
    } catch {
      toast.error("Failed to seed product catalog.");
    } finally {
      setSeeding(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedStockStatus("all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Product Catalog
            </h1>
            <Badge variant="brand">{pagination.total} Total Parts</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage spare parts inventory, dynamic attributes, and vehicle compatibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success("Product list refreshed");
            }}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/products/settings">
              <Settings className="size-4 text-primary" />
              <span>Product Settings</span>
            </Link>
          </Button>

          <Button onClick={handleOpenCreate} size="sm" className="gap-2 font-bold shadow-md shadow-primary/20">
            <Plus className="size-4" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Catalog
            </span>
            <Boxes className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">
            {formatNumber(metrics.totalProducts)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Active spare part lines
          </p>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Valuation
            </span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">
            {formatCurrency(metrics.totalInventoryValue)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Total cost of inventory on hand
          </p>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <AlertTriangle className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 mt-2">
            {formatNumber(metrics.lowStockCount)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            At or below reorder threshold
          </p>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-destructive uppercase tracking-wider">
              Out of Stock
            </span>
            <XCircle className="size-4 text-destructive" />
          </div>
          <p className="text-2xl font-black text-destructive mt-2">
            {formatNumber(metrics.outOfStockCount)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Zero units on hand
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 rounded-2xl border-border bg-card shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input (5 cols) */}
          <div className="lg:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by product name, part number, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>

          {/* Category Filter (2 cols) */}
          <div className="lg:col-span-2">
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Filter (2 cols) */}
          <div className="lg:col-span-2">
            <Select
              value={selectedBrand}
              onValueChange={(val) => {
                setSelectedBrand(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Status Filter (2 cols) */}
          <div className="lg:col-span-2">
            <Select
              value={selectedStockStatus}
              onValueChange={(val) => {
                setSelectedStockStatus(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Statuses</SelectItem>
                <SelectItem value="in_stock">In Stock (&gt; Reorder)</SelectItem>
                <SelectItem value="low_stock">Low Stock (≤ Reorder)</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock (0)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters (1 col) */}
          <div className="lg:col-span-1 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-muted-foreground hover:text-foreground w-full"
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-bold min-w-[200px]">Product / Part No.</TableHead>
              <TableHead className="font-bold">Category & Brand</TableHead>
              <TableHead className="font-bold">Specifications</TableHead>
              <TableHead className="font-bold">Vehicles</TableHead>
              <TableHead className="font-bold text-right">Selling Price</TableHead>
              <TableHead className="font-bold text-center">Stock Level</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span>Loading products inventory...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2.5 py-6">
                    <Package className="size-10 text-muted-foreground/50" />
                    <p className="font-bold text-base text-foreground">
                      No products found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">
                      {search || selectedCategory !== "all" || selectedBrand !== "all"
                        ? "No parts match the selected search or filter criteria. Try resetting filters."
                        : "Your vehicle spare-parts catalog is currently empty. Add your first product or seed the sample catalog."}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {search || selectedCategory !== "all" || selectedBrand !== "all" ? (
                        <Button variant="outline" size="sm" onClick={handleResetFilters}>
                          Reset Filters
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
                            <Plus className="size-3.5" /> Add Product
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSeed}
                            disabled={seeding}
                            className="gap-1.5"
                          >
                            <Sparkles className="size-3.5 text-primary" />
                            Seed Catalog
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const attrs = Object.entries(product.attributes || {});
                return (
                  <TableRow
                    key={product._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Name & Part Number */}
                    <TableCell>
                      <div>
                        <p className="font-bold text-foreground text-sm leading-tight">
                          {product.name}
                        </p>
                        {product.partNumber ? (
                          <code className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm mt-1 inline-block">
                            {product.partNumber}
                          </code>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 italic block mt-0.5">
                            No part #
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Category & Brand */}
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {product.category?.name || "Uncategorized"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">
                          {product.brand?.name || "Unbranded"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Dynamic Specifications */}
                    <TableCell>
                      {attrs.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {attrs.slice(0, 3).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border"
                            >
                              <strong className="capitalize">{k}</strong>:{" "}
                              {Array.isArray(v)
                                ? v.join(", ")
                                : typeof v === "boolean"
                                ? v
                                  ? "Yes"
                                  : "No"
                                : String(v)}
                            </span>
                          ))}
                          {attrs.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{attrs.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">
                          Standard
                        </span>
                      )}
                    </TableCell>

                    {/* Vehicle Compatibility */}
                    <TableCell>
                      {product.vehicleFitments.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {product.vehicleFitments.slice(0, 2).map((vf, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border flex items-center gap-1"
                            >
                              <Bike className="size-2.5 text-primary" />
                              <span>{vf.model?.name}</span>
                            </span>
                          ))}
                          {product.vehicleFitments.length > 2 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{product.vehicleFitments.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Universal
                        </Badge>
                      )}
                    </TableCell>

                    {/* Pricing */}
                    <TableCell className="text-right">
                      <div>
                        <p className="font-black text-foreground text-sm">
                          {formatCurrency(product.sellingPrice)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Cost: {formatCurrency(product.costPrice)}
                        </p>
                      </div>
                    </TableCell>

                    {/* Stock Status */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {product.isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                            Out of Stock
                          </Badge>
                        ) : product.isLowStock ? (
                          <Badge variant="warning" className="text-[10px] uppercase font-bold">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] uppercase font-bold">
                            In Stock
                          </Badge>
                        )}
                        <span className="text-xs font-mono font-bold text-foreground">
                          {product.quantityOnHand}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            (Min {product.reorderLevel})
                          </span>
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(product)}
                          className="h-8 w-8 p-0 hover:text-primary"
                          title="Edit Product"
                        >
                          <Edit2 className="size-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingProduct(product);
                            setDeleteOpen(true);
                          }}
                          className="h-8 w-8 p-0 hover:text-destructive text-muted-foreground"
                          title="Delete Product"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
            <span>
              Showing {products.length} of {pagination.total} parts
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Prev
              </Button>
              <span className="font-semibold text-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages}
                className="h-8 px-2.5"
              >
                Next <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Dialog (Create / Edit) */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        productToEdit={editingProduct}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Spare Part"
        description={
          deletingProduct
            ? `Are you sure you want to delete "${deletingProduct.name}" (${deletingProduct.partNumber || "No part #"})? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
