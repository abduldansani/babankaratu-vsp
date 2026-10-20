"use client";

import { useState, useEffect } from "react";
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
import { createPurchase } from "@/actions/purchaseActions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingBag, Loader2 } from "lucide-react";

interface NewPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewPurchaseModal({
  open,
  onOpenChange,
}: NewPurchaseModalProps) {
  const queryClient = useQueryClient();
  const [supplier, setSupplier] = useState("");
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [transport, setTransport] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPurchaseDate(new Date().toISOString().split("T")[0]);
  }, []);

  const totalVal = parseFloat(total) || 0;
  const paidVal = parseFloat(paid) || 0;
  const transVal = parseFloat(transport) || 0;
  const balanceVal = Math.max(0, totalVal - paidVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalVal <= 0) {
      toast.error("Please enter a valid purchase total");
      return;
    }

    setLoading(true);
    try {
      await createPurchase({
        supplier: supplier || "Main Parts Supplier",
        total: totalVal,
        paid: paidVal,
        balance: balanceVal,
        transport: transVal,
        notes,
        purchaseDate: purchaseDate || new Date(),
      });

      toast.success("Purchase record added successfully!");
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["profit-overview"] });

      // Reset
      setSupplier("");
      setTotal("");
      setPaid("");
      setTransport("");
      setNotes("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save purchase. Check database connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <ShoppingBag className="size-5 text-primary" />
            Record Inventory Purchase
          </DialogTitle>
          <DialogDescription>
            Record supplier orders, payments, remaining debt, and transport costs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier Name / Source</Label>
            <Input
              id="supplier"
              placeholder="e.g. Kano Auto Parts, Onitsha Importer"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="total">Invoice Total (₦)</Label>
              <Input
                id="total"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid">Amount Paid (₦)</Label>
              <Input
                id="paid"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="transport">Transport / Freight (₦)</Label>
              <Input
                id="transport"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Remaining Balance</Label>
              <div className="h-10 px-3.5 py-2 rounded-xl bg-muted/60 border border-input font-bold text-sm flex items-center text-amber-600 dark:text-amber-400">
                ₦{balanceVal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseNotes">Notes / Description</Label>
            <Input
              id="purchaseNotes"
              placeholder="e.g. Engine blocks, pistons, tire stock"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Save Purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
