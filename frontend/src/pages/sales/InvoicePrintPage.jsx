import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import "../../styles/print.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function InvoicePrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const hasAutoPrinted = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sale-invoice", id],
    enabled: Boolean(id),
    queryFn: () => api.sales.invoice(id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data || hasAutoPrinted.current) return;
    hasAutoPrinted.current = true;
    const timer = setTimeout(() => window.print(), 350);
    return () => clearTimeout(timer);
  }, [data]);

  if (isLoading) {
    return <div className="min-h-screen bg-slate-100 p-6 text-sm text-slate-600">Loading invoice...</div>;
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Invoice not found</div>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate("/sales")}>Back to POS</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-md justify-end gap-2">
        <button type="button" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm" onClick={() => navigate("/sales")}>Back</button>
        <button type="button" className="btn-primary" onClick={() => window.print()}>Print</button>
      </div>

      <div className="mx-auto">
        <div className="receipt-paper rounded-2xl border border-slate-200 bg-white p-3 shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="text-center">
            <h1 className="text-sm font-bold uppercase tracking-wide">Vertex Supermarket</h1>
            <div className="text-[11px]">Tax Invoice / Cash Bill</div>
            <div className="text-[10px] text-slate-600">Thank you for shopping</div>
          </div>

          <div className="receipt-divider mt-2" />

          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between gap-2"><span>Invoice</span><span className="text-right">{data.invoice_no}</span></div>
            <div className="flex justify-between gap-2"><span>Date</span><span className="text-right">{new Date(data.sale_date).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between gap-2"><span>Cashier</span><span className="text-right">{data.cashier_name || "-"}</span></div>
            <div className="flex justify-between gap-2"><span>Customer</span><span className="text-right">{data.customer_name || "Walk-in"}</span></div>
          </div>

          <div className="receipt-divider mt-2" />

          <div className="mt-2 text-[11px]">
            <div className="grid grid-cols-[1.35fr_.4fr_.5fr_.55fr] gap-1 font-semibold">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amt</span>
            </div>
          </div>

          <div className="receipt-divider mt-1" />

          <div className="mt-1 space-y-1 text-[11px]">
            {(data.items ?? []).map((item) => (
              <div key={item.id} className="grid grid-cols-[1.35fr_.4fr_.5fr_.55fr] gap-1">
                <span className="break-words">{item.product_name}</span>
                <span className="text-right">{Number(item.quantity).toFixed(2).replace(/\.00$/, "")}</span>
                <span className="text-right">{formatCurrency(item.unit_price)}</span>
                <span className="text-right">{formatCurrency(item.line_total)}</span>
              </div>
            ))}
          </div>

          <div className="receipt-divider mt-2" />

          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(data.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(data.discount_amount)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(data.tax_amount)}</span></div>
            <div className="flex justify-between font-bold text-[13px]"><span>Total</span><span>Rs {formatCurrency(data.total_amount)}</span></div>
          </div>

          <div className="receipt-divider mt-2" />

          <div className="mt-2 text-[11px]">
            <div className="font-semibold">Payments</div>
            {(data.payments ?? []).length ? (
              <div className="mt-1 space-y-1">
                {data.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between">
                    <span className="uppercase">{payment.payment_method}</span>
                    <span>{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1">No payment rows</div>
            )}
          </div>

          <div className="receipt-divider mt-2" />

          <div className="mt-2 text-center text-[10px]">
            <div>Goods once sold will not be taken back.</div>
            <div>Visit Again</div>
          </div>
        </div>
      </div>
    </div>
  );
}
