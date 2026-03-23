import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

const emptyMaster = { id: null, name: "", description: "", status: "active" };

function MasterForm({ title, form, setForm, onSubmit, onReset, loading, buttonLabel }) {
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input className="input" placeholder="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <input className="input" placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        <select className="input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex gap-3">
          <button className="btn-primary flex-1">{loading ? "Saving..." : buttonLabel}</button>
          {form.id ? (
            <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={onReset}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [categoryForm, setCategoryForm] = useState(emptyMaster);
  const [brandForm, setBrandForm] = useState(emptyMaster);
  const canCategoryEdit = hasPermission("categories.add") || hasPermission("categories.edit");
  const canCategoryDelete = hasPermission("categories.delete");
  const canBrandEdit = hasPermission("brands.add") || hasPermission("brands.edit");
  const canBrandDelete = hasPermission("brands.delete");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.data,
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => (await api.get("/brands")).data.data,
  });

  const saveCategory = useMutation({
    mutationFn: async (payload) =>
      payload.id ? (await api.put(`/categories/${payload.id}`, payload)).data.data : (await api.post("/categories", payload)).data.data,
    onSuccess: () => {
      setCategoryForm(emptyMaster);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const saveBrand = useMutation({
    mutationFn: async (payload) =>
      payload.id ? (await api.put(`/brands/${payload.id}`, payload)).data.data : (await api.post("/brands", payload)).data.data,
    onSuccess: () => {
      setBrandForm(emptyMaster);
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }) => api.delete(`/${type}/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [variables.type] });
    },
  });

  return (
    <Layout title="Categories & Brands">
      <div className="grid gap-6 xl:grid-cols-2">
        {canCategoryEdit ? <MasterForm
          title={categoryForm.id ? "Edit Category" : "Add Category"}
          form={categoryForm}
          setForm={setCategoryForm}
          loading={saveCategory.isPending}
          buttonLabel={categoryForm.id ? "Update Category" : "Save Category"}
          onReset={() => setCategoryForm(emptyMaster)}
          onSubmit={(event) => {
            event.preventDefault();
            saveCategory.mutate(categoryForm);
          }}
        /> : null}

        {canBrandEdit ? <MasterForm
          title={brandForm.id ? "Edit Brand" : "Add Brand"}
          form={brandForm}
          setForm={setBrandForm}
          loading={saveBrand.isPending}
          buttonLabel={brandForm.id ? "Update Brand" : "Save Brand"}
          onReset={() => setBrandForm(emptyMaster)}
          onSubmit={(event) => {
            event.preventDefault();
            saveBrand.mutate(brandForm);
          }}
        /> : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TableCard title="Category List">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(categories ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.description || "No description"}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                  <td className="px-4 py-3">{row.product_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canCategoryEdit ? <button className="text-emerald-600" onClick={() => setCategoryForm(row)}>Edit</button> : null}
                      {canCategoryDelete ? <button
                        className="text-rose-600"
                        onClick={() => {
                          if (window.confirm(`Delete category ${row.name}?`)) {
                            deleteMutation.mutate({ type: "categories", id: row.id });
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

        <TableCard title="Brand List">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(brands ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.description || "No description"}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                  <td className="px-4 py-3">{row.product_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canBrandEdit ? <button className="text-emerald-600" onClick={() => setBrandForm(row)}>Edit</button> : null}
                      {canBrandDelete ? <button
                        className="text-rose-600"
                        onClick={() => {
                          if (window.confirm(`Delete brand ${row.name}?`)) {
                            deleteMutation.mutate({ type: "brands", id: row.id });
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
    </Layout>
  );
}
