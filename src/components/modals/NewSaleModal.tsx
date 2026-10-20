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
import { createSale } from "@/actions/salesActions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewSaleModal({ open, onOpenChange }: NewSaleModalProps) {
  const queryClient = useQueryClient();
  const [motorcycle, setMotorcycle] = useState("");
  const [bicycle, setBicycle] = useState("");
  const [notes, setNotes] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaleDate(new Date().toISOString().split("T")[0]);
  }, []);

  const motoVal = parseFloat(motorcycle) || 0;
  const bicyVal = parseFloat(bicycle) || 0;
  const total = motoVal + bicyVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total <= 0) {
      toast.error("Please enter a valid sale amount");
      return;
    }

    setLoading(true);
    try {
      await createSale({
        motorcycle: motoVal,
        bicycle: bicyVal,
        totalAmount: total,
        notes,
        saleDate: saleDate || new Date(),
      });

      toast.success("Sale record added successfully!");
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["profit-overview"] });

      // Reset
      setMotorcycle("");
      setBicycle("");
      setNotes("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to record sale. Check database connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <PlusCircle className="size-5 text-primary" />
            Record Daily Sale
          </DialogTitle>
          <DialogDescription>
            Enter breakdown for motorcycle and bicycle spare parts sales.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="motorcycle">Motorcycle Parts (₦)</Label>
              <Input
                id="motorcycle"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={motorcycle}
                onChange={(e) => setMotorcycle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bicycle">Bicycle Parts (₦)</Label>
              <Input
                id="bicycle"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={bicycle}
                onChange={(e) => setBicycle(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">Total Sale</span>
            <span className="text-lg font-black text-primary">
              ₦{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="saleDate">Sale Date</Label>
            <Input
              id="saleDate"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Item Details (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Bajaj chain, spokes, tubes"
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
              Save Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
