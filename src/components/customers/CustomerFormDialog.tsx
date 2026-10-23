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
  createCustomer,
  updateCustomer,
  CustomerViewItem,
} from "@/actions/customerActions";
import { toast } from "sonner";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerToEdit?: CustomerViewItem | null;
  onSuccess?: () => void;
}

export default function CustomerFormDialog({
  open,
  onOpenChange,
  customerToEdit,
  onSuccess,
}: CustomerFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(customerToEdit);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || "");
      setPhone(customerToEdit.phone || "");
      setEmail(customerToEdit.email || "");
      setAddress(customerToEdit.address || "");
      setNotes(customerToEdit.notes || "");
      setIsActive(customerToEdit.isActive ?? true);
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNotes("");
      setIsActive(true);
    }
    setFormError(null);
  }, [customerToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && customerToEdit) {
        const result = await updateCustomer(customerToEdit._id, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          isActive,
        });

        if (!result.success) {
          setFormError(result.error || "Failed to update customer.");
          return;
        }

        toast.success(`Customer "${name.trim()}" updated successfully.`);
      } else {
        const result = await createCustomer({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          isActive,
        });

        if (!result.success) {
          setFormError(result.error || "Failed to create customer.");
          return;
        }

        toast.success(`Customer "${name.trim()}" registered successfully.`);
      }

      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["active-customers"] });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-black">
            {isEditing ? (
              <>
                <UserCheck className="size-5 text-primary" />
                Edit Customer
              </>
            ) : (
              <>
                <UserPlus className="size-5 text-primary" />
                Register New Customer
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update customer contact details and account status."
              : "Register a customer to track vehicle parts sales, credit, and repayments."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cust-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cust-name"
              placeholder="e.g. Alhaji Musa Danladi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Phone Number</Label>
              <Input
                id="cust-phone"
                placeholder="e.g. 0803 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cust-email">Email Address (Optional)</Label>
              <Input
                id="cust-email"
                type="email"
                placeholder="e.g. customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cust-address">Shop / Residential Address</Label>
            <Input
              id="cust-address"
              placeholder="e.g. Shop 12, Wunti Market, Bauchi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cust-notes">Notes / Vehicle Fleet Information</Label>
            <Textarea
              id="cust-notes"
              rows={2}
              placeholder="Optional notes, preferred mechanic, vehicle makes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          {isEditing && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="cust-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="cust-active" className="text-sm font-medium cursor-pointer">
                Customer account is active
              </Label>
            </div>
          )}

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
              {isEditing ? "Save Changes" : "Register Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
