import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

const emptyItem = { product_id: "", quantity: 1, unit_price: "", gst_percent: "0", batch_no: "", expiry_date: "" };

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [header, setHeader] = useState({ supplier_id: "", notes: "", discount_amount: "0" });
  const [items, setItems] = useState([emptyItem]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [payment, setPayment] = useState({ payment_method: "cash", amount: "", reference_no: "", notes: "" });
  const canCreate = hasPermission("purchases.add");
  const canReceive = hasPermission("grn.receive");
  const canPay = hasPermission("purchases.edit") || hasPermission("expenses.add");

  const { data: purchases } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => (await api.get("/purchases")).data.data,
  });

  const { data: purchaseDetails } = useQuery({
    queryKey: ["purchase-details", selectedPurchaseId],
    enabled: Boolean(selectedPurchaseId),
    queryFn: async () => (await api.get(`/purchases/${selectedPurchaseId}`)).data.data,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data.data,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data.data,
  });

  const purchaseTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const gst = Number(item.gst_percent || 0);
        const base = quantity * unitPrice;
        return sum + base + base * (gst / 100);
      }, 0),
    [items]
  );

  const createPurchase = useMutation({
    mutationFn: async (payload) => (await api.post("/purchases", payload)).data.data,
    onSuccess: () => {
      setHeader({ supplier_id: "", notes: "", discount_amount: "0" });
      setItems([emptyItem]);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });

  const receivePurchase = useMutation({
    mutationFn: async (payload) => (await api.post(`/purchases/${selectedPurchaseId}/receive`, payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-details", selectedPurchaseId] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const recordPayment = useMutation({
    mutationFn: async (payload) => (await api.post(`/purchases/${selectedPurchaseId}/payments`, payload)).data.data,
    onSuccess: () => {
      setPayment({ payment_method: "cash", amount: "", reference_no: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-details", selectedPurchaseId] });
    },
  });

  return (
    <Layout title="Purchases">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          {canCreate ? <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Create Purchase Order</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                createPurchase.mutate({
                  ...header,
                  supplier_id: Number(header.supplier_id),
                  discount_amount: Number(header.discount_amount || 0),
                  items: items.map((item) => ({
                    ...item,
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    gst_percent: Number(item.gst_percent || 0),
                  })),
                });
              }}
            >
              <select className="input" value={header.supplier_id} onChange={(event) => setHeader((current) => ({ ...current, supplier_id: event.target.value }))}>
                <option value="">Select supplier</option>
                {(suppliers ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.supplier_name}
                  </option>
                ))}
              </select>
              {items.map((item, index) => (
                <div key={`${index}-${item.product_id}`} className="space-y-3 rounded-2xl border border-slate-200 p-3">
                  <select className="input" value={item.product_id} onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, product_id: event.target.value } : row)))}>
                    <option value="">Select product</option>
                    {(products ?? []).map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="input" type="number" min="1" placeholder="Quantity" value={item.quantity} onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: event.target.value } : row)))} />
                    <input className="input" type="number" min="0" step="0.01" placeholder="Unit price" value={item.unit_price} onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, unit_price: event.target.value } : row)))} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="input" type="number" min="0" step="0.01" placeholder="GST %" value={item.gst_percent} onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, gst_percent: event.target.value } : row)))} />
                    <input className="input" placeholder="Batch no" value={item.batch_no} onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, batch_no: event.target.value } : row)))} />
                  </div>
                  <input className="input" type="date" value={item.expiry_date} onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, expiry_date: event.target.value } : row)))} />
                </div>
              ))}
              <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setItems((current) => [...current, emptyItem])}>
                Add Item
              </button>
              <textarea className="input min-h-24" placeholder="Notes" value={header.notes} onChange={(event) => setHeader((current) => ({ ...current, notes: event.target.value }))} />
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">Estimated total: ₹ {purchaseTotal.toFixed(2)}</div>
              <button className="btn-primary w-full">{createPurchase.isPending ? "Saving..." : "Create Purchase Order"}</button>
            </form>
          </div> : null}

          {purchaseDetails && (canReceive || canPay) ? (
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-slate-900">GRN & Supplier Payment</h3>
              <div className="mt-4 grid gap-3">
                {canReceive ? <button className="btn-primary" onClick={() => receivePurchase.mutate({ items: purchaseDetails.items })}>
                  {receivePurchase.isPending ? "Receiving..." : "Receive Full PO"}
                </button> : null}
                <input className="input" type="number" min="0" step="0.01" placeholder="Payment amount" value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} />
                <select className="input" value={payment.payment_method} onChange={(event) => setPayment((current) => ({ ...current, payment_method: event.target.value }))}>
                  {["cash", "card", "upi", "wallet", "bank"].map((method) => (
                    <option key={method} value={method}>
                      {method.toUpperCase()}
                    </option>
                  ))}
                </select>
                <input className="input" placeholder="Reference no" value={payment.reference_no} onChange={(event) => setPayment((current) => ({ ...current, reference_no: event.target.value }))} />
                {canPay ? <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm" onClick={() => recordPayment.mutate({ ...payment, amount: Number(payment.amount) })}>
                  Record Payment
                </button> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <TableCard title="Purchase Orders">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">PO No</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {(purchases ?? []).map((row) => (
                  <tr key={row.id} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50" onClick={() => setSelectedPurchaseId(row.id)}>
                    <td className="px-4 py-3">{row.po_number}</td>
                    <td className="px-4 py-3">{row.supplier_name}</td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3">₹ {row.paid_amount}</td>
                    <td className="px-4 py-3">₹ {row.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          {purchaseDetails ? (
            <TableCard title={`PO Details: ${purchaseDetails.po_number}`}>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Ordered</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchaseDetails.items ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{row.product_name}</td>
                      <td className="px-4 py-3">{row.quantity}</td>
                      <td className="px-4 py-3">{row.received_quantity}</td>
                      <td className="px-4 py-3">₹ {row.unit_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
