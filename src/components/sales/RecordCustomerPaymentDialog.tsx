"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordCustomerPayment } from "@/actions/customerPaymentActions";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { HandCoins, Loader2, AlertCircle, Receipt } from "lucide-react";

interface RecordCustomerPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target?: {
    customerId?: string;
    customerName?: string;
    saleId?: string;
    saleNumber?: string;
    maxAmount?: number;
  } | null;
  onSuccess?: (payment: any) => void;
}

export default function RecordCustomerPaymentDialog({
  open,
  onOpenChange,
  target,
  onSuccess,
}: RecordCustomerPaymentDialogProps) {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (target?.maxAmount && target.maxAmount > 0) {
        setAmount(target.maxAmount.toString());
      } else {
        setAmount("");
      }
      setPaymentMethod("cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setReference("");
      setNotes("");
      setFormError(null);
    }
  }, [open, target]);

  const maxAllowed = target?.maxAmount || 0;
  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (numAmount <= 0) {
      setFormError("Payment amount must be greater than zero.");
      return;
    }

    if (maxAllowed > 0 && numAmount > maxAllowed + 0.01) {
      setFormError(
        `Payment amount cannot exceed outstanding balance of ${formatCurrency(maxAllowed)}.`
      );
      return;
    }

    setLoading(true);
    try {
      const result = await recordCustomerPayment({
        customerId: target?.customerId,
        saleId: target?.saleId,
        amount: numAmount,
        paymentDate: paymentDate || new Date().toISOString(),
        paymentMethod: paymentMethod as any,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setFormError(result.error || "Failed to record customer payment.");
        return;
      }

      toast.success(
        `Payment of ${formatCurrency(numAmount)} recorded successfully!`
      );

      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["customer-details"] });
      queryClient.invalidateQueries({ queryKey: ["sale-details"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });

      onOpenChange(false);
      onSuccess?.(result.data);
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            <HandCoins className="size-5 text-emerald-600 dark:text-emerald-400" />
            Record Customer Repayment
          </DialogTitle>
          <DialogDescription>
            {target?.saleNumber
              ? `Repayment towards invoice ${target.saleNumber}`
              : target?.customerName
              ? `Repayment against debt for ${target.customerName}`
              : "Record payment against customer credit."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Account & Debt summary */}
          <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 space-y-1.5">
            {target?.customerName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Customer:</span>
                <span className="font-bold text-foreground">{target.customerName}</span>
              </div>
            )}
            {target?.saleNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Sale Invoice:</span>
                <span className="font-mono font-semibold text-primary">
                  {target.saleNumber}
                </span>
              </div>
            )}
            {maxAllowed > 0 && (
              <div className="flex justify-between text-sm pt-1 border-t border-border/50">
                <span className="text-muted-foreground font-medium">
                  Outstanding Debt:
                </span>
                <span className="font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(maxAllowed)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pay-amount">
                Repayment Amount (₦) <span className="text-destructive">*</span>
              </Label>
              {maxAllowed > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(maxAllowed.toString())}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  Pay Full Balance
                </button>
              )}
            </div>
            <Input
              id="pay-amount"
              type="number"
              step="any"
              min="0.01"
              max={maxAllowed > 0 ? maxAllowed : undefined}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={loading}
              autoFocus
              className="text-lg font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pay-method">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={loading}
              >
                <SelectTrigger id="pay-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-date">Payment Date</Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-ref">Reference / Bank Transaction ID</Label>
            <Input
              id="pay-ref"
              placeholder="e.g. TRF-98234 / POS receipt no."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea
              id="pay-notes"
              rows={2}
              placeholder="Optional notes or remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
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
            <Button
              type="submit"
              disabled={loading || numAmount <= 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <HandCoins className="size-4" />
              )}
              Confirm Repayment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
