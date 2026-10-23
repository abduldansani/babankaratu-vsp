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
import { Printer, HandCoins } from "lucide-react";

interface CustomerPaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
}

export default function CustomerPaymentReceiptModal({
  open,
  onOpenChange,
  payment,
}: CustomerPaymentReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!open || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const isReversed = payment.status === "reversed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between no-print">
          <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
            <HandCoins className="size-5 text-emerald-600 dark:text-emerald-400" />
            Payment Receipt Preview
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

        {/* Printable Payment Receipt */}
        <div
          ref={receiptRef}
          id="printable-payment-receipt"
          className="p-6 sm:p-8 bg-white text-zinc-950 font-sans text-sm print:p-0 print:m-0 print:w-full"
        >
          {/* Header */}
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

            <div className="mt-3 inline-block bg-emerald-800 text-white font-black text-xs px-3 py-1 uppercase tracking-wider rounded">
              {isReversed ? "REVERSED PAYMENT RECEIPT" : "CUSTOMER PAYMENT RECEIPT"}
            </div>
          </div>

          {/* Payment Metadata */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-zinc-200 text-xs">
            <div>
              <div className="text-zinc-500 font-medium">PAYMENT NUMBER:</div>
              <div className="font-mono font-bold text-sm text-zinc-900">
                {payment.paymentNumber}
              </div>

              <div className="text-zinc-500 font-medium mt-2">PAYMENT DATE:</div>
              <div className="font-semibold text-zinc-800">
                {formatDate(payment.paymentDate || payment.createdAt)}
              </div>

              <div className="text-zinc-500 font-medium mt-2">PAYMENT METHOD:</div>
              <div className="font-bold uppercase text-zinc-900">
                {payment.paymentMethod ? payment.paymentMethod.replace("_", " ") : "CASH"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-zinc-500 font-medium">CUSTOMER NAME:</div>
              <div className="font-bold text-sm text-zinc-900">
                {payment.customerName || "Customer"}
              </div>

              {payment.reference && (
                <div className="mt-2">
                  <div className="text-zinc-500 font-medium">REFERENCE / TRANS ID:</div>
                  <div className="font-mono text-zinc-800 font-semibold">
                    {payment.reference}
                  </div>
                </div>
              )}

              <div className="text-zinc-500 font-medium mt-2">STATUS:</div>
              <div className="font-black uppercase tracking-wider">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                    isReversed
                      ? "bg-red-100 text-red-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {payment.status || "ACTIVE"}
                </span>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="my-5 rounded-lg border-2 border-zinc-900 bg-zinc-50 p-4 text-center">
            <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider block">
              AMOUNT RECEIVED
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono mt-1 block">
              {formatCurrency(payment.amount)}
            </span>
          </div>

          {/* Allocations Table */}
          {payment.allocations && payment.allocations.length > 0 && (
            <div className="py-3">
              <div className="text-xs font-bold text-zinc-700 uppercase mb-2">
                Applied Invoice Allocations
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-400 text-zinc-600 font-bold">
                    <th className="py-1.5 text-left">Invoice / Sale Number</th>
                    <th className="py-1.5 text-right">Amount Allocated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {payment.allocations.map((alloc: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 font-mono font-semibold text-zinc-900">
                        {alloc.saleNumber || "Sale Allocation"}
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-zinc-900">
                        {formatCurrency(alloc.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div className="rounded border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-600 my-3">
              <span className="font-bold text-zinc-800">Remark:</span> {payment.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 pb-4 text-xs">
            <div className="border-t border-zinc-400 pt-2 text-center text-zinc-600">
              <span className="font-semibold block">Customer Signature</span>
            </div>
            <div className="border-t border-zinc-400 pt-2 text-center text-zinc-600">
              <span className="font-semibold block">Cashier / Authorized Signature</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="border-t-2 border-zinc-900 border-dashed pt-4 text-center text-[11px] text-zinc-600 space-y-1">
            <p className="font-bold text-zinc-900">
              Official Payment Receipt • Baban Karatu Vehicle Spare Parts
            </p>
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
            #printable-payment-receipt,
            #printable-payment-receipt * {
              visibility: visible;
            }
            #printable-payment-receipt {
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
