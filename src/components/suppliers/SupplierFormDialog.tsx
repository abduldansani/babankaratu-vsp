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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  createSupplier,
  updateSupplier,
  SupplierViewItem,
} from "@/actions/supplierActions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, Loader2, Building2 } from "lucide-react";

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierToEdit?: SupplierViewItem | null;
  onSuccess?: () => void;
}

export default function SupplierFormDialog({
  open,
  onOpenChange,
  supplierToEdit,
  onSuccess,
}: SupplierFormDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || "");
      setPhone(supplierToEdit.phone || "");
      setEmail(supplierToEdit.email || "");
      setContactPerson(supplierToEdit.contactPerson || "");
      setAddress(supplierToEdit.address || "");
      setNotes(supplierToEdit.notes || "");
      setIsActive(supplierToEdit.isActive ?? true);
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setContactPerson("");
      setAddress("");
      setNotes("");
      setIsActive(true);
    }
  }, [supplierToEdit, open]);

  const isEditing = Boolean(supplierToEdit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Supplier business name is required");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && supplierToEdit) {
        const res = await updateSupplier(supplierToEdit._id, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          isActive,
        });

        if (res.success) {
          toast.success("Supplier updated successfully!");
          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
          queryClient.invalidateQueries({
            queryKey: ["supplier", supplierToEdit._id],
          });
          onSuccess?.();
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to update supplier");
        }
      } else {
        const res = await createSupplier({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          isActive: true,
        });

        if (res.success) {
          toast.success("Supplier created successfully!");
          queryClient.invalidateQueries({ queryKey: ["suppliers"] });
          onSuccess?.();
          onOpenChange(false);
        } else {
          toast.error(res.error || "Failed to create supplier");
        }
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
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
              <Building2 className="size-5 text-primary" />
            ) : (
              <Truck className="size-5 text-primary" />
            )}
            {isEditing ? "Edit Supplier Record" : "Add New Parts Supplier"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update vendor contact details, notes, and operating status."
              : "Register a vendor to track purchase orders, bills, and creditor payments."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="supplierName" className="font-semibold">
              Supplier / Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="supplierName"
              placeholder="e.g. Kano Auto Importers Ltd, Dan-Alhaji Bearings"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson" className="text-xs font-semibold">
                Contact Person / Representative
              </Label>
              <Input
                id="contactPerson"
                placeholder="e.g. Alhaji Mustapha"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="e.g. 08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="supplier@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-semibold">
                Physical Address / City / Market
              </Label>
              <Input
                id="address"
                placeholder="e.g. Shop 42, Kofar Ruwa Market, Kano"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Notes & Terms (Bank details, payment terms, etc.)
            </Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="e.g. Accepts 50% advance, balance in 14 days. First Bank: 3012345678"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {isEditing && (
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="active-status" className="text-sm font-semibold">
                  Active Supplier Status
                </Label>
                <p className="text-xs text-muted-foreground">
                  Inactive suppliers cannot be selected on new purchase invoices.
                </p>
              </div>
              <Switch
                id="active-status"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
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
              {isEditing ? "Save Changes" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
