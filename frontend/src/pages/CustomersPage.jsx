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

  return (
    <Layout title="Customers">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          {canSave ? <div className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">{form.id ? "Edit Customer" : "Add Customer"}</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveCustomer.mutate(form);
              }}
            >
              <input className="input" placeholder="Customer name" value={form.customer_name} onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))} />
              <input className="input" placeholder="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              <input className="input" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              <textarea className="input min-h-24" placeholder="Address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              <button className="btn-primary w-full">{saveCustomer.isPending ? "Saving..." : form.id ? "Update Customer" : "Save Customer"}</button>
            </form>
          </div> : null}

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
            <table className="min-w-full text-sm">
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
                {(customers ?? []).map((row) => (
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
                        {hasPermission("customers.edit") ? <button className="text-emerald-600" onClick={() => setForm(row)}>Edit</button> : null}
                        <button className="text-slate-700" onClick={() => setSelectedCustomerId(row.id)}>Profile</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          {customerProfile ? (
            <TableCard title="Purchase History">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Cashier</th>
                    <th className="px-4 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(customerProfile.sales ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{row.invoice_no}</td>
                      <td className="px-4 py-3">{new Date(row.sale_date).toLocaleString()}</td>
                      <td className="px-4 py-3">{row.cashier_name}</td>
                      <td className="px-4 py-3">₹ {row.total_amount}</td>
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
