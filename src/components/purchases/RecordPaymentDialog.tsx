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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordSupplierPayment } from "@/actions/supplierPaymentActions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId?: string;
  purchaseNumber?: string;
  supplierId: string;
  supplierName: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  purchaseId,
  purchaseNumber,
  supplierId,
  supplierName,
  currentBalance,
  onSuccess,
}: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bank_transfer" | "pos" | "cheque" | "other"
  >("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(currentBalance > 0 ? String(currentBalance) : "");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("bank_transfer");
      setReference("");
      setNotes("");
    }
  }, [open, currentBalance]);

  const amountVal = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountVal <= 0) {
      toast.error("Please enter a valid payment amount greater than zero");
      return;
    }

    if (purchaseId && amountVal > currentBalance + 0.01) {
      toast.error(
        `Amount cannot exceed the invoice balance of ${formatCurrency(
          currentBalance
        )}`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await recordSupplierPayment({
        supplierId,
        purchaseId: purchaseId || undefined,
        amount: amountVal,
        paymentDate: paymentDate || new Date().toISOString(),
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success("Payment recorded successfully!");
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        if (purchaseId) {
          queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId] });
        }
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
        queryClient.invalidateQueries({ queryKey: ["supplier-details"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        queryClient.invalidateQueries({ queryKey: ["profit-overview"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to record payment");
      }
    } catch {
      toast.error("An unexpected error occurred while recording the payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <CreditCard className="size-5 text-primary" />
            Record Supplier Remittance
          </DialogTitle>
          <DialogDescription>
            Record cash remittance or bank transfer paid to settle vendor obligations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Supplier & Invoice info card */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Supplier:</span>
              <span className="font-bold text-foreground text-sm">{supplierName}</span>
            </div>
            {purchaseNumber && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Invoice Reference:</span>
                <span className="font-mono font-bold text-foreground">
                  {purchaseNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-border/50 pt-1.5">
              <span className="text-muted-foreground">Current Outstanding Balance:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pay-amount" className="text-xs font-semibold">
                Payment Amount (₦) <span className="text-destructive">*</span>
              </Label>
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(currentBalance))}
                  className="text-[11px] text-primary font-bold hover:underline"
                >
                  Pay Full Balance
                </button>
              )}
            </div>
            <Input
              id="pay-amount"
              type="number"
              min="0.01"
              max={purchaseId ? currentBalance : undefined}
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-date" className="text-xs font-semibold">
                Payment Date
              </Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-method" className="text-xs font-semibold">
                Payment Method
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(val: any) => setPaymentMethod(val)}
              >
                <SelectTrigger id="pay-method" className="h-10">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash in Hand</SelectItem>
                  <SelectItem value="pos">POS / Card</SelectItem>
                  <SelectItem value="cheque">Bank Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-ref" className="text-xs font-semibold">
              Bank Ref / Transaction / Receipt #
            </Label>
            <Input
              id="pay-ref"
              placeholder="e.g. TRF-90238472 or Teller #104"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes" className="text-xs font-semibold">
              Payment Memo / Notes
            </Label>
            <Input
              id="pay-notes"
              placeholder="e.g. Part payment for engine parts order"
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
              Confirm Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
