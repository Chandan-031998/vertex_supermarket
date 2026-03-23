import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

const adjustmentTemplate = {
  product_id: "",
  movement_type: "stock_in",
  quantity: "",
  batch_no: "",
  expiry_date: "",
  purchase_price: "",
  selling_price: "",
  notes: "",
};

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [adjustment, setAdjustment] = useState(adjustmentTemplate);
  const canAdjust = hasPermission("inventory.adjust");

  const { data: inventory } = useQuery({
    queryKey: ["inventory", search],
    queryFn: async () => (await api.get(`/inventory${search ? `?search=${encodeURIComponent(search)}` : ""}`)).data.data,
  });

  const { data: summary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: async () => (await api.get("/inventory/summary")).data.data,
  });

  const { data: movements } = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: async () => (await api.get("/inventory/movements")).data.data,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data.data,
  });

  const adjustStock = useMutation({
    mutationFn: async (payload) => (await api.post("/inventory/adjustments", payload)).data.data,
    onSuccess: () => {
      setAdjustment(adjustmentTemplate);
      ["inventory", "inventory-summary", "inventory-movements", "reports-sales-summary"].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
    },
  });

  return (
    <Layout title="Inventory">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tracked Products" value={summary?.summary?.total_products ?? 0} />
        <StatCard label="Total Units" value={summary?.summary?.total_units ?? 0} />
        <StatCard label="Low Stock" value={summary?.summary?.low_stock_count ?? 0} />
        <StatCard label="Damaged Units" value={summary?.summary?.damaged_units ?? 0} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          {canAdjust ? <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Stock Adjustment</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                adjustStock.mutate({
                  ...adjustment,
                  product_id: Number(adjustment.product_id),
                  quantity: Number(adjustment.quantity),
                  purchase_price: Number(adjustment.purchase_price || 0),
                  selling_price: Number(adjustment.selling_price || 0),
                });
              }}
            >
              <select className="input" value={adjustment.product_id} onChange={(event) => setAdjustment((current) => ({ ...current, product_id: event.target.value }))}>
                <option value="">Select product</option>
                {(products ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select className="input" value={adjustment.movement_type} onChange={(event) => setAdjustment((current) => ({ ...current, movement_type: event.target.value }))}>
                <option value="stock_in">Stock In</option>
                <option value="stock_out">Stock Out</option>
                <option value="adjustment">Adjustment (+/-)</option>
                <option value="damage">Damaged Stock</option>
              </select>
              <input className="input" type="number" step="1" placeholder="Quantity" value={adjustment.quantity} onChange={(event) => setAdjustment((current) => ({ ...current, quantity: event.target.value }))} />
              <input className="input" placeholder="Batch no (optional)" value={adjustment.batch_no} onChange={(event) => setAdjustment((current) => ({ ...current, batch_no: event.target.value }))} />
              <input className="input" type="date" value={adjustment.expiry_date} onChange={(event) => setAdjustment((current) => ({ ...current, expiry_date: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" type="number" min="0" step="0.01" placeholder="Purchase price" value={adjustment.purchase_price} onChange={(event) => setAdjustment((current) => ({ ...current, purchase_price: event.target.value }))} />
                <input className="input" type="number" min="0" step="0.01" placeholder="Selling price" value={adjustment.selling_price} onChange={(event) => setAdjustment((current) => ({ ...current, selling_price: event.target.value }))} />
              </div>
              <textarea className="input min-h-24" placeholder="Notes" value={adjustment.notes} onChange={(event) => setAdjustment((current) => ({ ...current, notes: event.target.value }))} />
              <button className="btn-primary w-full">{adjustStock.isPending ? "Updating..." : "Apply Adjustment"}</button>
            </form>
          </div> : null}

          <TableCard title="Expiry Alerts">
            <div className="space-y-3">
              {(summary?.expiry_alerts ?? []).slice(0, 8).map((row) => (
                <div key={row.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
                  <div className="font-medium text-slate-900">{row.product_name}</div>
                  <div className="text-slate-600">
                    Batch {row.batch_no || "-"} • Qty {row.quantity} • Exp {row.expiry_date || "-"}
                  </div>
                </div>
              ))}
            </div>
          </TableCard>
        </div>

        <div className="space-y-6">
          <div className="card p-4">
            <input className="input" placeholder="Search stock by name / SKU / barcode" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <TableCard title="Current Stock">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Damaged</th>
                  <th className="px-4 py-3">Batch / Expiry</th>
                </tr>
              </thead>
              <tbody>
                {(inventory ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.product_name}</div>
                      <div className="text-xs text-slate-500">{row.sku}</div>
                    </td>
                    <td className="px-4 py-3">{row.category_name || "-"}</td>
                    <td className="px-4 py-3">{row.current_stock}</td>
                    <td className="px-4 py-3">{row.damaged_stock}</td>
                    <td className="px-4 py-3">
                      <div>{row.batch_count} batches</div>
                      <div className="text-xs text-slate-500">{row.nearest_expiry || "No expiry tracking"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Stock Movements">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(movements ?? []).slice(0, 20).map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{row.product_name}</td>
                    <td className="px-4 py-3 capitalize">{row.movement_type.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{row.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </Layout>
  );
}
