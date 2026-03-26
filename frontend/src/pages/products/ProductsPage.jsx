import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import Layout from "../../components/Layout";
import TableCard from "../../components/TableCard";
import { useAuth } from "../../context/AuthContext";
import BulkBarcodePrintModal from "../../components/barcode/BulkBarcodePrintModal";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState({ search: "", category_id: "", brand_id: "", status: "" });
  const [form, setForm] = useState(emptyForm);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [singlePrintProduct, setSinglePrintProduct] = useState(null);
  const [singlePrintCopies, setSinglePrintCopies] = useState(1);
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

  const selectedProducts = useMemo(() => {
    const idSet = new Set(selectedProductIds);
    return (products ?? []).filter((row) => idSet.has(row.id));
  }, [products, selectedProductIds]);

  const currentPageIds = useMemo(() => (products ?? []).map((row) => row.id), [products]);
  const isAllCurrentSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedProductIds.includes(id));

  function toggleSelectProduct(id) {
    setSelectedProductIds((current) => (current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]));
  }

  function toggleSelectAllCurrent() {
    setSelectedProductIds((current) => {
      if (isAllCurrentSelected) {
        return current.filter((id) => !currentPageIds.includes(id));
      }

      const set = new Set(current);
      currentPageIds.forEach((id) => set.add(id));
      return [...set];
    });
  }

  function openSinglePrintDialog(product) {
    if (!String(product.barcode ?? "").trim()) {
      window.alert("This product does not have a barcode.");
      return;
    }

    setSinglePrintProduct(product);
    setSinglePrintCopies(1);
  }

  function handleSinglePrint() {
    if (!singlePrintProduct) return;

    navigate("/products/barcode-print", {
      state: {
        items: [
          {
            id: singlePrintProduct.id,
            productName: singlePrintProduct.name,
            barcode: singlePrintProduct.barcode,
            price: singlePrintProduct.selling_price,
            copies: Math.max(1, Number(singlePrintCopies || 1)),
          },
        ],
      },
    });

    setSinglePrintProduct(null);
  }

  function handleBulkPrint(items) {
    if (!items.length) {
      window.alert("No printable products selected.");
      return;
    }

    navigate("/products/barcode-print", {
      state: { items },
    });

    setIsBulkModalOpen(false);
  }

  const productRows = products ?? [];

  return (
    <Layout title="Products">
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        {canAdd || canEdit ? (
          <div className="card p-4 sm:p-5 xl:sticky xl:top-6">
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <input className="input" placeholder="SKU" value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} />
                <input className="input" placeholder="Barcode" value={form.barcode} onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <input className="input" placeholder="Unit" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
                <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <input className="input" type="number" min="0" step="0.01" placeholder="MRP" value={form.mrp} onChange={(event) => setForm((current) => ({ ...current, mrp: event.target.value }))} />
                <input className="input" type="number" min="0" step="0.01" placeholder="Selling price" value={form.selling_price} onChange={(event) => setForm((current) => ({ ...current, selling_price: event.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <input className="input" type="number" min="0" step="0.01" placeholder="Purchase price" value={form.purchase_price} onChange={(event) => setForm((current) => ({ ...current, purchase_price: event.target.value }))} />
                <input className="input" type="number" min="0" step="0.01" placeholder="GST %" value={form.gst_percent} onChange={(event) => setForm((current) => ({ ...current, gst_percent: event.target.value }))} />
              </div>
              <input className="input" type="number" min="0" placeholder="Reorder level" value={form.reorder_level} onChange={(event) => setForm((current) => ({ ...current, reorder_level: event.target.value }))} />
              <input className="input" placeholder="Image URL (optional)" value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={form.track_batch} onChange={(event) => setForm((current) => ({ ...current, track_batch: event.target.checked }))} />
                  Track batch
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={form.track_expiry} onChange={(event) => setForm((current) => ({ ...current, track_expiry: event.target.checked }))} />
                  Track expiry
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="btn-primary w-full">{saveProduct.isPending ? "Saving..." : form.id ? "Update Product" : "Save Product"}</button>
                {form.id ? (
                  <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400" onClick={() => setForm(emptyForm)}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="card p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

          <TableCard
            title="Product List"
            action={(
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                disabled={!selectedProducts.length}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bulk Print Barcodes ({selectedProducts.length})
              </button>
            )}
          >
            <div className="space-y-3 p-4 md:hidden">
              {productRows.length ? productRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <label className="mt-0.5">
                      <input type="checkbox" checked={selectedProductIds.includes(row.id)} onChange={() => toggleSelectProduct(row.id)} aria-label={`Select ${row.name}`} />
                    </label>
                    <button className="text-xs text-slate-700 transition hover:text-emerald-700" onClick={() => openSinglePrintDialog(row)}>
                      Print Barcode
                    </button>
                  </div>
                  <div className="mt-2 font-medium text-slate-900">{row.name}</div>
                  <div className="text-xs text-slate-500">{row.sku}{row.barcode ? ` • ${row.barcode}` : ""}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>{row.category_name || "-"}</div>
                    <div>{row.brand_name || "No brand"}</div>
                    <div>Selling: ₹ {row.selling_price}</div>
                    <div>MRP: ₹ {row.mrp}</div>
                    <div className="col-span-2">Stock: {row.current_stock} • Reorder: {row.reorder_level}</div>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm">
                    {canEdit ? <button className="text-emerald-600 transition hover:text-emerald-700" onClick={() => setForm({ ...row, track_batch: Boolean(row.track_batch), track_expiry: Boolean(row.track_expiry) })}>
                      Edit
                    </button> : null}
                    {canDelete ? <button
                      className="text-rose-600 transition hover:text-rose-700"
                      onClick={() => {
                        if (window.confirm(`Delete product ${row.name}?`)) {
                          deleteProduct.mutate(row.id);
                        }
                      }}
                    >
                      Delete
                    </button> : null}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No products found for the current filters.</div>
              )}
            </div>

            <table className="hidden min-w-full text-sm md:table">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={isAllCurrentSelected} onChange={toggleSelectAllCurrent} aria-label="Select all products" />
                  </th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Master</th>
                  <th className="px-4 py-3">Pricing</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productRows.length ? productRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedProductIds.includes(row.id)} onChange={() => toggleSelectProduct(row.id)} aria-label={`Select ${row.name}`} />
                    </td>
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
                      <div className="flex flex-wrap gap-2">
                        <button className="text-slate-700 transition hover:text-emerald-700" onClick={() => openSinglePrintDialog(row)}>
                          Print Barcode
                        </button>
                        {canEdit ? <button className="text-emerald-600 transition hover:text-emerald-700" onClick={() => setForm({ ...row, track_batch: Boolean(row.track_batch), track_expiry: Boolean(row.track_expiry) })}>
                          Edit
                        </button> : null}
                        {canDelete ? <button
                          className="text-rose-600 transition hover:text-rose-700"
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
                )) : (
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                      No products found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>

      <BulkBarcodePrintModal
        isOpen={isBulkModalOpen}
        selectedProducts={selectedProducts}
        onClose={() => setIsBulkModalOpen(false)}
        onPrint={handleBulkPrint}
      />

      {singlePrintProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Print Barcode</h3>
            <p className="mt-1 text-sm text-slate-500">{singlePrintProduct.name}</p>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Number of labels</label>
              <input
                type="number"
                min="1"
                max="500"
                value={singlePrintCopies}
                onChange={(event) => setSinglePrintCopies(Math.max(1, Math.min(500, Number(event.target.value || 1))))}
                className="input"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setSinglePrintProduct(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleSinglePrint}>
                Continue to Print
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
