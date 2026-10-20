"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CategoryTab from "@/components/settings/CategoryTab";
import AttributeTab from "@/components/settings/AttributeTab";
import BrandTab from "@/components/settings/BrandTab";
import VehicleTab from "@/components/settings/VehicleTab";
import { seedProductCatalog } from "@/actions/productActions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings,
  ArrowLeft,
  Tags,
  Sliders,
  Award,
  Bike,
  Sparkles,
  Loader2,
  Package,
} from "lucide-react";

export default function ProductSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedProductCatalog();
      if (res.success) {
        toast.success(String(res.data || "Product catalog seeded successfully!"));
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Products</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Product Settings
            </h1>
            <Badge variant="brand">Configuration</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage product categories, dynamic specifications, brands, and vehicle models.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="gap-2"
          >
            {seeding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5 text-primary" />
            )}
            <span>Seed Sample Catalog</span>
          </Button>

          <Button asChild size="sm" className="gap-2">
            <Link href="/products">
              <Package className="size-4" />
              <span>View Inventory</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1.5 gap-1 bg-muted/60 rounded-2xl">
          <TabsTrigger
            value="categories"
            className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold"
          >
            <Tags className="size-4 text-primary" />
            <span>Categories</span>
          </TabsTrigger>

          <TabsTrigger
            value="attributes"
            className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold"
          >
            <Sliders className="size-4 text-primary" />
            <span>Attributes</span>
          </TabsTrigger>

          <TabsTrigger
            value="brands"
            className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold"
          >
            <Award className="size-4 text-primary" />
            <span>Brands</span>
          </TabsTrigger>

          <TabsTrigger
            value="vehicles"
            className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold"
          >
            <Bike className="size-4 text-primary" />
            <span>Vehicles</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="focus-visible:outline-none">
          <CategoryTab />
        </TabsContent>

        <TabsContent value="attributes" className="focus-visible:outline-none">
          <AttributeTab />
        </TabsContent>

        <TabsContent value="brands" className="focus-visible:outline-none">
          <BrandTab />
        </TabsContent>

        <TabsContent value="vehicles" className="focus-visible:outline-none">
          <VehicleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
