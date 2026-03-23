import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  id: null,
  name: "",
  sku: "",
  barcode: "",
  category_id: "",
  brand_id: "",
  unit: "pcs",
  mrp: "",
  selling_price: "",
  purchase_price: "",
  gst_percent: "0",
  reorder_level: "0",
  track_batch: false,
  track_expiry: false,
  status: "active",
  image: "",
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState({ search: "", category_id: "", brand_id: "", status: "" });
  const [form, setForm] = useState(emptyForm);
  const canAdd = hasPermission("products.add");
  const canEdit = hasPermission("products.edit");
  const canDelete = hasPermission("products.delete");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters]);

  const { data: products } = useQuery({
    queryKey: ["products", queryString],
    queryFn: async () => (await api.get(`/products${queryString ? `?${queryString}` : ""}`)).data.data,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => (await api.get("/brands")).data.data,
  });

  const saveProduct = useMutation({
    mutationFn: async (payload) =>
      payload.id ? (await api.put(`/products/${payload.id}`, payload)).data.data : (await api.post("/products", payload)).data.data,
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  return (
    <Layout title="Products">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {canAdd || canEdit ? <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">{form.id ? "Edit Product" : "Add Product"}</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveProduct.mutate({
                ...form,
                category_id: form.category_id ? Number(form.category_id) : null,
                brand_id: form.brand_id ? Number(form.brand_id) : null,
                mrp: Number(form.mrp || 0),
                selling_price: Number(form.selling_price || 0),
                purchase_price: Number(form.purchase_price || 0),
                gst_percent: Number(form.gst_percent || 0),
                reorder_level: Number(form.reorder_level || 0),
              });
            }}
            className="mt-4 grid gap-3"
          >
            <input className="input" placeholder="Product name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="SKU" value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
              <input className="input" placeholder="Barcode" value={form.barcode} onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input" value={form.category_id} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}>
                <option value="">Select category</option>
                {(categories ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select className="input" value={form.brand_id} onChange={(event) => setForm((current) => ({ ...current, brand_id: event.target.value }))}>
                <option value="">Select brand</option>
                {(brands ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="Unit" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
              <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" type="number" min="0" step="0.01" placeholder="MRP" value={form.mrp} onChange={(event) => setForm((current) => ({ ...current, mrp: event.target.value }))} />
              <input className="input" type="number" min="0" step="0.01" placeholder="Selling price" value={form.selling_price} onChange={(event) => setForm((current) => ({ ...current, selling_price: event.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" type="number" min="0" step="0.01" placeholder="Purchase price" value={form.purchase_price} onChange={(event) => setForm((current) => ({ ...current, purchase_price: event.target.value }))} />
              <input className="input" type="number" min="0" step="0.01" placeholder="GST %" value={form.gst_percent} onChange={(event) => setForm((current) => ({ ...current, gst_percent: event.target.value }))} />
            </div>
            <input className="input" type="number" min="0" placeholder="Reorder level" value={form.reorder_level} onChange={(event) => setForm((current) => ({ ...current, reorder_level: event.target.value }))} />
            <input className="input" placeholder="Image URL (optional)" value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={form.track_batch} onChange={(event) => setForm((current) => ({ ...current, track_batch: event.target.checked }))} />
                Track batch
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <input type="checkbox" checked={form.track_expiry} onChange={(event) => setForm((current) => ({ ...current, track_expiry: event.target.checked }))} />
                Track expiry
              </label>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1">{saveProduct.isPending ? "Saving..." : form.id ? "Update Product" : "Save Product"}</button>
              {form.id ? (
                <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setForm(emptyForm)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div> : null}

        <div className="space-y-6">
          <div className="card p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <input className="input" placeholder="Search by name / SKU / barcode" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
              <select className="input" value={filters.category_id} onChange={(event) => setFilters((current) => ({ ...current, category_id: event.target.value }))}>
                <option value="">All categories</option>
                {(categories ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select className="input" value={filters.brand_id} onChange={(event) => setFilters((current) => ({ ...current, brand_id: event.target.value }))}>
                <option value="">All brands</option>
                {(brands ?? []).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <TableCard title="Product List">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Master</th>
                  <th className="px-4 py-3">Pricing</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(products ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.name}</div>
                      <div className="text-xs text-slate-500">{row.sku}{row.barcode ? ` • ${row.barcode}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.category_name || "-"}</div>
                      <div className="text-xs text-slate-500">{row.brand_name || "No brand"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>Selling: ₹ {row.selling_price}</div>
                      <div className="text-xs text-slate-500">MRP ₹ {row.mrp} • GST {row.gst_percent}%</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.current_stock}</div>
                      <div className="text-xs text-slate-500">Reorder at {row.reorder_level}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canEdit ? <button className="text-emerald-600" onClick={() => setForm({ ...row, track_batch: Boolean(row.track_batch), track_expiry: Boolean(row.track_expiry) })}>
                          Edit
                        </button> : null}
                        {canDelete ? <button
                          className="text-rose-600"
                          onClick={() => {
                            if (window.confirm(`Delete product ${row.name}?`)) {
                              deleteProduct.mutate(row.id);
                            }
                          }}
                        >
                          Delete
                        </button> : null}
                      </div>
                    </td>
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
