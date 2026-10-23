"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { Printer } from "lucide-react";

interface SaleReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: any;
}

export default function SaleReceiptModal({
  open,
  onOpenChange,
  sale,
}: SaleReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!open || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const isCancelled = sale.status === "cancelled";
  const isPaid = sale.paymentStatus === "paid" || (sale.balance || 0) <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between no-print">
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <Printer className="size-5 text-primary" />
            Sales Receipt Preview
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 font-bold bg-primary text-primary-foreground"
            >
              <Printer className="size-4" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Receipt Container */}
        <div
          ref={receiptRef}
          id="printable-sale-receipt"
          className="p-6 sm:p-8 bg-white text-zinc-950 font-sans text-sm print:p-0 print:m-0 print:w-full"
        >
          {/* Shop Header */}
          <div className="text-center pb-5 border-b-2 border-zinc-900 border-dashed">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-zinc-950">
              Baban Karatu Spare Parts
            </h2>
            <p className="text-xs text-zinc-600 font-medium mt-0.5">
              Dealers in Genuine Motorcycle & Vehicle Spare Parts
            </p>
            <p className="text-xs text-zinc-600">
              Main Market Commercial Area, Bauchi State, Nigeria
            </p>
            <p className="text-xs text-zinc-600 font-mono mt-0.5">
              Tel: +234 803 000 0000 | +234 802 000 0000
            </p>

            <div className="mt-3 inline-block bg-zinc-900 text-white font-black text-xs px-3 py-1 uppercase tracking-wider rounded">
              {isCancelled ? "CANCELLED SALE INVOICE" : "SALES RECEIPT"}
            </div>
          </div>

          {/* Receipt & Customer Metadata */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-zinc-200 text-xs">
            <div>
              <div className="text-zinc-500 font-medium">RECEIPT NUMBER:</div>
              <div className="font-mono font-bold text-sm text-zinc-900">
                {sale.saleNumber || `LEGACY-${String(sale._id).slice(-6)}`}
              </div>

              <div className="text-zinc-500 font-medium mt-2">DATE & TIME:</div>
              <div className="font-semibold text-zinc-800">
                {formatDate(sale.saleDate || sale.createdAt)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-zinc-500 font-medium">CUSTOMER:</div>
              <div className="font-bold text-sm text-zinc-900">
                {sale.customerName || (sale.isWalkIn ? "Walk-in Customer" : "Counter Customer")}
              </div>
              {sale.customerPhone && (
                <div className="font-mono text-zinc-600">
                  {sale.customerPhone}
                </div>
              )}

              <div className="text-zinc-500 font-medium mt-2">PAYMENT STATUS:</div>
              <div className="font-black uppercase tracking-wider">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                    isCancelled
                      ? "bg-red-100 text-red-800"
                      : isPaid
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isCancelled ? "CANCELLED" : sale.paymentStatus || "PAID"}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-900 text-zinc-900 uppercase font-black tracking-wider">
                  <th className="py-2 text-left">Item Description</th>
                  <th className="py-2 text-center w-14">Qty</th>
                  <th className="py-2 text-right w-24">Price</th>
                  <th className="py-2 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-medium text-zinc-800">
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5">
                        <div className="font-bold text-zinc-900">
                          {item.productName}
                        </div>
                        {item.partNumber && (
                          <div className="font-mono text-[10px] text-zinc-500">
                            Part #: {item.partNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 text-right font-mono">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-zinc-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))
                ) : (
                  // Legacy item display
                  <tr>
                    <td className="py-3" colSpan={3}>
                      <div className="font-bold text-zinc-900">
                        Motorcycle & Bicycle Spare Parts (Counter Aggregate)
                      </div>
                      <div className="text-zinc-500 text-[11px]">
                        Motorcycle: {formatCurrency(sale.motorcycle || 0)} | Bicycle: {formatCurrency(sale.bicycle || 0)}
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Calculations */}
          <div className="border-t-2 border-zinc-900 pt-3 pb-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">
                {formatCurrency(sale.subtotal || sale.totalAmount)}
              </span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Discount Allowed:</span>
                <span className="font-mono font-semibold text-red-600">
                  - {formatCurrency(sale.discount)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black border-t border-zinc-300 pt-2 text-zinc-900">
              <span className="uppercase">Net Total:</span>
              <span className="font-mono text-base">
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between text-zinc-700 pt-1">
              <span className="font-semibold">Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatCurrency(sale.paidAmount !== undefined ? sale.paidAmount : sale.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between text-xs pt-1 border-t border-dashed border-zinc-300">
              <span className="font-bold text-zinc-900">Balance Due:</span>
              <span
                className={`font-mono font-black ${
                  (sale.balance || 0) > 0 ? "text-red-600" : "text-zinc-900"
                }`}
              >
                {formatCurrency(sale.balance || 0)}
              </span>
            </div>
          </div>

          {/* Notes if any */}
          {sale.notes && (
            <div className="rounded border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-600 mb-4">
              <span className="font-bold text-zinc-800">Remark:</span> {sale.notes}
            </div>
          )}

          {/* Footer Notice */}
          <div className="border-t-2 border-zinc-900 border-dashed pt-4 text-center text-[11px] text-zinc-600 space-y-1">
            <p className="font-bold text-zinc-900">
              Thank you for your patronage!
            </p>
            <p>Goods sold in good condition are not returnable after 3 days.</p>
            <p className="font-mono text-[9px] text-zinc-400">
              Generated by Baban Karatu VSP System
            </p>
          </div>
        </div>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-sale-receipt,
            #printable-sale-receipt * {
              visibility: visible;
            }
            #printable-sale-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              padding: 20px !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
