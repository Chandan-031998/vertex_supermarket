import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

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
  const [form, setForm] = useState(emptyForm);
  const canSave = hasPermission("suppliers.add") || hasPermission("suppliers.edit");

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await api.get("/suppliers")).data.data,
  });

  const saveSupplier = useMutation({
    mutationFn: async (payload) =>
      payload.id ? (await api.put(`/suppliers/${payload.id}`, payload)).data.data : (await api.post("/suppliers", payload)).data.data,
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  return (
    <Layout title="Suppliers">
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {canSave ? <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">{form.id ? "Edit Supplier" : "Add Supplier"}</h3>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveSupplier.mutate(form);
            }}
          >
            {[
              ["supplier_name", "Supplier name"],
              ["contact_person", "Contact person"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["gst_no", "GST no"],
              ["address", "Address"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "Pincode"],
            ].map(([key, label]) => (
              <input key={key} className="input" placeholder={label} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
            ))}
            <button className="btn-primary w-full">{saveSupplier.isPending ? "Saving..." : form.id ? "Update Supplier" : "Save Supplier"}</button>
          </form>
        </div> : null}

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
              {(suppliers ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{row.supplier_name}</div>
                    <div className="text-xs text-slate-500">{row.email || "No email"}</div>
                  </td>
                  <td className="px-4 py-3">{row.contact_person || row.phone || "-"}</td>
                  <td className="px-4 py-3">₹ {row.purchase_total}</td>
                  <td className="px-4 py-3">₹ {row.paid_amount}</td>
                  <td className="px-4 py-3">₹ {row.pending_dues}</td>
                  <td className="px-4 py-3">
                    {hasPermission("suppliers.edit") ? <button className="text-emerald-600" onClick={() => setForm(row)}>
                      Edit
                    </button> : null}
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
