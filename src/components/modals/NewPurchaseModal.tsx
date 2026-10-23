"use client";

import PurchaseFormDialog from "@/components/purchases/PurchaseFormDialog";

interface NewPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewPurchaseModal({
  open,
  onOpenChange,
}: NewPurchaseModalProps) {
  return (
    <PurchaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
