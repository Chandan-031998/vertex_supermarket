import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

function buildPayment(method = "cash") {
  return { payment_method: method, amount: "", reference_no: "" };
}

export default function SalesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [payments, setPayments] = useState([buildPayment("cash")]);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const canCreateSale = hasPermission("pos.add");
  const canHoldSale = hasPermission("pos.hold");
  const canResume = hasPermission("pos.resume");
  const canPrint = hasPermission("pos.print");
  const canRefund = hasPermission("pos.refund");

  const { data: productResults } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: async () => (await api.get(`/products/search/pos?q=${encodeURIComponent(search)}`)).data.data,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await api.get("/customers")).data.data,
  });

  const { data: sales } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => (await api.get("/sales")).data.data,
  });

  const { data: heldBills } = useQuery({
    queryKey: ["held-bills"],
    queryFn: async () => (await api.get("/sales/held")).data.data,
  });

  const { data: saleDetails } = useQuery({
    queryKey: ["sale-details", selectedSaleId],
    enabled: Boolean(selectedSaleId),
    queryFn: async () => (await api.get(`/sales/${selectedSaleId}`)).data.data,
  });

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.quantity * Number(item.unit_price), 0);
    const discount = cart.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0);
    const tax = cart.reduce(
      (sum, item) => sum + (item.quantity * Number(item.unit_price) - Number(item.discount_amount || 0)) * (Number(item.gst_percent || 0) / 100),
      0
    );
    return {
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax,
    };
  }, [cart]);

  const createSale = useMutation({
    mutationFn: async (payload) => (await api.post("/sales", payload)).data.data,
    onSuccess: (data) => {
      setCart([]);
      setNotes("");
      setPayments([buildPayment("cash")]);
      setSelectedSaleId(data.id);
      ["sales", "inventory", "held-bills", "reports-pack", "dashboard-summary"].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    },
  });

  const holdSale = useMutation({
    mutationFn: async (payload) => (await api.post("/sales/hold", payload)).data.data,
    onSuccess: () => {
      setCart([]);
      setNotes("");
      ["held-bills", "sales"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });

  const returnSale = useMutation({
    mutationFn: async (payload) => (await api.post(`/sales/${selectedSaleId}/return`, payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale-details", selectedSaleId] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      if (existing) {
        return current.map((item) => (item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }

      return [
        ...current,
        {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          quantity: 1,
          unit_price: Number(product.selling_price),
          gst_percent: Number(product.gst_percent || 0),
          discount_amount: 0,
        },
      ];
    });
  }

  function completeSale(extra = {}) {
    createSale.mutate({
      customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
      notes,
      items: cart,
      payments: payments.map((payment) => ({ ...payment, amount: Number(payment.amount || 0) })),
      ...extra,
    });
  }

  return (
    <Layout title="Sales / POS">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_420px]">
        <div className="space-y-6">
          <div className="card p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
              <input className="input" placeholder="Scan barcode or search name / SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
              <select className="input" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                <option value="">Walk-in customer</option>
                {(customers ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.customer_name} {row.phone ? `(${row.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TableCard title="Product Search">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(productResults ?? []).map((product) => (
                <button key={product.id} className="rounded-2xl border border-slate-200 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={!canCreateSale} onClick={() => addToCart(product)}>
                  <div className="font-semibold text-slate-900">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{product.sku}{product.barcode ? ` • ${product.barcode}` : ""}</div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>₹ {product.selling_price}</span>
                    <span className="text-slate-500">Stock {product.current_stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </TableCard>

          <TableCard title="Bill History">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3">Payments</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {(sales ?? []).map((row) => (
                  <tr key={row.id} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50" onClick={() => setSelectedSaleId(row.id)}>
                    <td className="px-4 py-3">{row.invoice_no}</td>
                    <td className="px-4 py-3">{row.customer_name || "Walk-in"}</td>
                    <td className="px-4 py-3">{row.cashier_name}</td>
                    <td className="px-4 py-3 uppercase">{row.payment_methods || "-"}</td>
                    <td className="px-4 py-3">₹ {row.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>

        <div className="space-y-6">
          {canCreateSale || canHoldSale || canPrint || canRefund ? <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Current Cart</h3>
              <button className="text-sm text-slate-500" onClick={() => setCart([])}>
                Clear
              </button>
            </div>
            <div className="space-y-3">
              {cart.length ? (
                cart.map((item) => (
                  <div key={item.product_id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{item.product_name}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                      </div>
                      <button className="text-xs text-rose-600" onClick={() => setCart((current) => current.filter((row) => row.product_id !== item.product_id))}>
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <input className="input" type="number" min="1" value={item.quantity} onChange={(event) => setCart((current) => current.map((row) => (row.product_id === item.product_id ? { ...row, quantity: Number(event.target.value) } : row)))} />
                      <input className="input" type="number" min="0" step="0.01" value={item.discount_amount} onChange={(event) => setCart((current) => current.map((row) => (row.product_id === item.product_id ? { ...row, discount_amount: Number(event.target.value) } : row)))} />
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">₹ {(item.quantity * item.unit_price).toFixed(2)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  Search a product and add it to the cart.
                </div>
              )}
            </div>

            <textarea className="input mt-4 min-h-24" placeholder="Bill notes / GST invoice notes" value={notes} onChange={(event) => setNotes(event.target.value)} />

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>₹ {totals.subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-sm"><span>Discount</span><span>₹ {totals.discount.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-sm"><span>Tax</span><span>₹ {totals.tax.toFixed(2)}</span></div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span>₹ {totals.total.toFixed(2)}</span></div>
            </div>

            <div className="mt-4 space-y-3">
              {payments.map((payment, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-3">
                  <select className="input" value={payment.payment_method} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, payment_method: event.target.value } : row)))}>
                    {["cash", "card", "upi", "wallet", "mixed"].map((method) => (
                      <option key={method} value={method}>
                        {method.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <input className="input" type="number" min="0" step="0.01" placeholder="Amount" value={payment.amount} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, amount: event.target.value } : row)))} />
                  <input className="input" placeholder="Reference" value={payment.reference_no} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, reference_no: event.target.value } : row)))} />
                </div>
              ))}
              <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setPayments((current) => [...current, buildPayment("upi")])}>
                Add Payment Row
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {canHoldSale ? <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" onClick={() => holdSale.mutate({ customer_id: selectedCustomerId ? Number(selectedCustomerId) : null, notes, items: cart })}>
                {holdSale.isPending ? "Holding..." : "Hold Bill"}
              </button> : <div />}
              {canCreateSale ? <button className="btn-primary" onClick={() => completeSale()}>
                {createSale.isPending ? "Processing..." : "Complete Sale"}
              </button> : null}
            </div>
          </div> : null}

          {canResume ? <TableCard title="Held Bills">
            <div className="space-y-3">
              {(heldBills ?? []).map((bill) => (
                <div key={bill.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{bill.hold_code}</div>
                      <div className="text-xs text-slate-500">{bill.customer_name || "Walk-in"} • {bill.item_count} items</div>
                    </div>
                    <button
                      className="text-emerald-600"
                      onClick={async () => {
                        const response = await api.get(`/sales/held/${bill.id}`);
                        const held = response.data.data;
                        setSelectedCustomerId(held.customer_id || "");
                        setNotes(held.notes || "");
                        setCart(
                          held.items.map((item) => ({
                            product_id: item.product_id,
                            product_name: item.product_name,
                            sku: item.sku,
                            quantity: item.quantity,
                            unit_price: Number(item.unit_price),
                            gst_percent: Number(item.gst_percent || 0),
                            discount_amount: Number(item.discount_amount || 0),
                            batch_id: item.batch_id,
                          }))
                        );
                        setPayments([buildPayment("cash")]);
                      }}
                    >
                      Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </TableCard> : null}

          {saleDetails ? (
            <TableCard title={`Invoice Preview: ${saleDetails.invoice_no}`}>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">Vertex Supermarket GST Invoice</div>
                    <div className="text-slate-500">{saleDetails.customer_name || "Walk-in customer"}</div>
                  </div>
                  {canPrint ? <button className="btn-primary" onClick={() => window.print()}>
                    Print
                  </button> : null}
                </div>
                <div className="space-y-2">
                  {(saleDetails.items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{item.product_name} x {item.quantity}</span>
                      <span>₹ {item.line_total}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>₹ {saleDetails.total_amount}</span>
                </div>
                {canRefund ? <button
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm"
                  onClick={() =>
                    returnSale.mutate({
                      items: (saleDetails.items ?? []).slice(0, 1).map((item) => ({
                        sale_item_id: item.id,
                        quantity: 1,
                        reason: "Basic return",
                      })),
                    })
                  }
                >
                  Basic Return (first item)
                </button> : null}
              </div>
            </TableCard>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
