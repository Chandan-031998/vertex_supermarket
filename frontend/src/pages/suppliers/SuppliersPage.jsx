import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "../../components/Layout";
import TableCard from "../../components/TableCard";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const emptyForm = {
  id: null,
  supplier_name: "",
  contact_person: "",
  phone: "",
  email: "",
  gst_no: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  status: "active",
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const canSave = hasPermission("suppliers.add") || hasPermission("suppliers.edit");
  const canDelete = hasPermission("suppliers.delete");

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", search],
    queryFn: () => api.suppliers.list({ search }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => (payload.id ? api.suppliers.update(payload.id, payload) : api.suppliers.create(payload)),
    onSuccess: () => {
      setMessage(form.id ? "Supplier updated successfully" : "Supplier added successfully");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error) => {
      setMessage(error?.response?.data?.message || "Failed to save supplier");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.suppliers.remove(id),
    onSuccess: () => {
      setMessage("Supplier deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error) => {
      setMessage(error?.response?.data?.message || "Failed to delete supplier");
    },
  });

  const rows = useMemo(() => suppliers, [suppliers]);

  return (
    <Layout title="Suppliers">
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {canSave ? (
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">{form.id ? "Edit Supplier" : "Add Supplier"}</h3>
            {message ? <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</div> : null}
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage("");
                saveMutation.mutate(form);
              }}
            >
              {[
                ["supplier_name", "Supplier name", true],
                ["contact_person", "Contact person"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["gst_no", "GST no"],
                ["address", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "Pincode"],
              ].map(([field, label, required]) => (
                <input
                  key={field}
                  className="input"
                  placeholder={label}
                  value={form[field]}
                  required={Boolean(required)}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                />
              ))}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button className="btn-primary w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : form.id ? "Update" : "Save"}</button>
                {form.id ? <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setForm(emptyForm)}>Cancel</button> : null}
              </div>
            </form>
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="card p-4">
            <input className="input" placeholder="Search suppliers by name / phone / email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <TableCard title="Supplier Ledger Snapshot">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Purchase Total</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Dues</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>Loading suppliers...</td></tr>
                ) : rows.length ? rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.supplier_name}</div>
                      <div className="text-xs text-slate-500 capitalize">{row.status}</div>
                    </td>
                    <td className="px-4 py-3">{row.contact_person || row.phone || "-"}</td>
                    <td className="px-4 py-3">₹ {Number(row.purchase_total || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">₹ {Number(row.paid_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">₹ {Number(row.pending_dues || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {hasPermission("suppliers.edit") ? <button className="text-emerald-600" onClick={() => setForm(row)}>Edit</button> : null}
                        {canDelete ? (
                          <button
                            className="text-rose-600"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Delete supplier ${row.supplier_name}?`)) {
                                setMessage("");
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>No suppliers found.</td></tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </Layout>
  );
}
