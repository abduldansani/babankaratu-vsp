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
import { recordProfitTaking } from "@/actions/profitActions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TrendingUp, Loader2 } from "lucide-react";

interface NewProfitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewProfitModal({
  open,
  onOpenChange,
}: NewProfitModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTakenAt(new Date().toISOString().split("T")[0]);
  }, []);

  const amountVal = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountVal <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await recordProfitTaking({
        amount: amountVal,
        recipient: recipient || "Partner / Shareholder",
        notes,
        takenAt: takenAt || new Date(),
      });

      toast.success("Profit withdrawal recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["profit-overview"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      // Reset
      setAmount("");
      setRecipient("");
      setNotes("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to record profit taking. Check database connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <TrendingUp className="size-5 text-primary" />
            Record Profit Withdrawal
          </DialogTitle>
          <DialogDescription>
            Record dividend or profit distribution to partners from net profits.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="profitAmount">Amount (₦)</Label>
            <Input
              id="profitAmount"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Beneficiary / Partner</Label>
            <Input
              id="recipient"
              placeholder="e.g. Partner A, Management Share"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="takenAt">Date</Label>
            <Input
              id="takenAt"
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Remarks / Purpose</Label>
            <Input
              id="notes"
              placeholder="e.g. Mid-month dividend distribution"
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
