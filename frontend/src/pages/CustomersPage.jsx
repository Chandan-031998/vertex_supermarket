import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

const emptyForm = { id: null, customer_name: "", phone: "", email: "", address: "", status: "active" };

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const canSave = hasPermission("customers.add") || hasPermission("customers.edit");

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await api.get("/customers")).data.data,
  });

  const { data: customerProfile } = useQuery({
    queryKey: ["customer-profile", selectedCustomerId],
    enabled: Boolean(selectedCustomerId),
    queryFn: async () => (await api.get(`/customers/${selectedCustomerId}`)).data.data,
  });

  const saveCustomer = useMutation({
    mutationFn: async (payload) =>
      payload.id ? (await api.put(`/customers/${payload.id}`, payload)).data.data : (await api.post("/customers", payload)).data.data,
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (selectedCustomerId) {
        queryClient.invalidateQueries({ queryKey: ["customer-profile", selectedCustomerId] });
      }
    },
  });

  const customerRows = customers ?? [];
  const purchaseHistoryRows = customerProfile?.sales ?? [];

  return (
    <Layout title="Customers">
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          {canSave ? (
            <div className="card p-4 sm:p-5 xl:sticky xl:top-6">
              <h3 className="text-lg font-semibold text-slate-900">{form.id ? "Edit Customer" : "Add Customer"}</h3>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveCustomer.mutate(form);
                }}
              >
                <input className="input" placeholder="Customer name" value={form.customer_name} onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <input className="input" placeholder="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                  <input className="input" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                </div>
                <textarea className="input min-h-24 resize-y" placeholder="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
                <button className="btn-primary w-full">{saveCustomer.isPending ? "Saving..." : form.id ? "Update Customer" : "Save Customer"}</button>
              </form>
            </div>
          ) : null}

          {customerProfile ? (
            <TableCard title="Customer Profile">
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-slate-900">{customerProfile.customer_name}</div>
                <div>Phone: {customerProfile.phone || "-"}</div>
                <div>Email: {customerProfile.email || "-"}</div>
                <div>Loyalty Points: {customerProfile.loyalty_points}</div>
                <div className="text-slate-500">Promotions and notifications scaffolds can use this profile data.</div>
              </div>
            </TableCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <TableCard title="Customer List">
            <div className="space-y-3 p-4 md:hidden">
              {customerRows.length ? customerRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="font-medium text-slate-900">{row.customer_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.email || "No email"}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>Phone: {row.phone || "-"}</div>
                    <div>Loyalty: {row.loyalty_points}</div>
                    <div className="col-span-2">Lifetime: ₹ {row.lifetime_value}</div>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm">
                    {hasPermission("customers.edit") ? <button className="text-emerald-600 transition hover:text-emerald-700" onClick={() => setForm(row)}>Edit</button> : null}
                    <button className="text-slate-700 transition hover:text-slate-900" onClick={() => setSelectedCustomerId(row.id)}>Profile</button>
                  </div>
                </div>
              )) : (
                <div className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No customers found yet.</div>
              )}
            </div>

            <table className="hidden min-w-full text-sm md:table">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Lifetime Value</th>
                  <th className="px-4 py-3">Loyalty</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customerRows.length ? customerRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.customer_name}</div>
                      <div className="text-xs text-slate-500">{row.email || "No email"}</div>
                    </td>
                    <td className="px-4 py-3">{row.phone || "-"}</td>
                    <td className="px-4 py-3">₹ {row.lifetime_value}</td>
                    <td className="px-4 py-3">{row.loyalty_points}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {hasPermission("customers.edit") ? <button className="text-emerald-600 transition hover:text-emerald-700" onClick={() => setForm(row)}>Edit</button> : null}
                        <button className="text-slate-700 transition hover:text-slate-900" onClick={() => setSelectedCustomerId(row.id)}>Profile</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr className="border-t border-slate-200">
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No customers found yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>

          {customerProfile ? (
            <TableCard title="Purchase History">
              <div className="space-y-3 p-4 md:hidden">
                {purchaseHistoryRows.length ? purchaseHistoryRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <div className="font-medium text-slate-900">{row.invoice_no}</div>
                    <div className="mt-1 text-xs text-slate-500">{new Date(row.sale_date).toLocaleString()}</div>
                    <div className="mt-2 text-xs text-slate-600">Cashier: {row.cashier_name}</div>
                    <div className="mt-1 font-semibold text-slate-900">₹ {row.total_amount}</div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No purchase history available.</div>
                )}
              </div>
              <table className="hidden min-w-full text-sm md:table">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistoryRows.length ? purchaseHistoryRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{row.invoice_no}</td>
                      <td className="px-4 py-3">{new Date(row.sale_date).toLocaleString()}</td>
                      <td className="px-4 py-3">{row.cashier_name}</td>
                      <td className="px-4 py-3">₹ {row.total_amount}</td>
                    </tr>
                  )) : (
                    <tr className="border-t border-slate-200">
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>No purchase history available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
