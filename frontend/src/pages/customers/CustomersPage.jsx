import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "../../components/Layout";
import TableCard from "../../components/TableCard";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const emptyForm = {
  id: null,
  customer_name: "",
  phone: "",
  email: "",
  address: "",
  status: "active",
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const canSave = hasPermission("customers.add") || hasPermission("customers.edit");
  const canDelete = hasPermission("customers.delete");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: () => api.customers.list({ search }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => (payload.id ? api.customers.update(payload.id, payload) : api.customers.create(payload)),
    onSuccess: () => {
      setMessage(form.id ? "Customer updated successfully" : "Customer added successfully");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      setMessage(error?.response?.data?.message || "Failed to save customer");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.customers.remove(id),
    onSuccess: () => {
      setMessage("Customer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      setMessage(error?.response?.data?.message || "Failed to delete customer");
    },
  });

  const rows = useMemo(() => customers, [customers]);

  return (
    <Layout title="Customers">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {canSave ? (
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">{form.id ? "Edit Customer" : "Add Customer"}</h3>
            {message ? <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</div> : null}
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setMessage("");
                saveMutation.mutate(form);
              }}
            >
              <input className="input" placeholder="Customer name" value={form.customer_name} onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))} required />
              <input className="input" placeholder="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              <input className="input" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <textarea className="input min-h-24" placeholder="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button className="btn-primary w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : form.id ? "Update" : "Save"}</button>
                {form.id ? <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setForm(emptyForm)}>Cancel</button> : null}
              </div>
            </form>
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="card p-4">
            <input className="input" placeholder="Search customers by name / phone / email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>

          <TableCard title="Customer List">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Loyalty</th>
                  <th className="px-4 py-3">Lifetime Value</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>Loading customers...</td></tr>
                ) : rows.length ? rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.customer_name}</div>
                      <div className="text-xs text-slate-500 capitalize">{row.status}</div>
                    </td>
                    <td className="px-4 py-3">{row.phone || "-"}</td>
                    <td className="px-4 py-3">{row.email || "-"}</td>
                    <td className="px-4 py-3">{row.loyalty_points || 0}</td>
                    <td className="px-4 py-3">₹ {Number(row.lifetime_value || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {hasPermission("customers.edit") ? <button className="text-emerald-600" onClick={() => setForm(row)}>Edit</button> : null}
                        {canDelete ? (
                          <button
                            className="text-rose-600"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Delete customer ${row.customer_name}?`)) {
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
                  <tr><td className="px-4 py-4 text-slate-500" colSpan={6}>No customers found.</td></tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </Layout>
  );
}
