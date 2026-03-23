import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import TableCard from "../components/TableCard";
import { useAuth } from "../context/AuthContext";

const defaultForm = {
  expense_date: new Date().toISOString().slice(0, 10),
  title: "",
  amount: "",
  payment_method: "cash",
  notes: "",
};

export default function AccountingPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const canAddExpense = hasPermission("expenses.add");

  const { data: summary } = useQuery({
    queryKey: ["accounting-summary"],
    queryFn: async () => (await api.get("/accounting/summary")).data.data,
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await api.get("/accounting/expenses")).data.data,
  });

  const createExpense = useMutation({
    mutationFn: async (payload) => (await api.post("/accounting/expenses", payload)).data.data,
    onSuccess: () => {
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
    },
  });

  return (
    <Layout title="Accounting">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales Total" value={`₹ ${summary?.sales_total ?? 0}`} />
        <StatCard label="Purchase Total" value={`₹ ${summary?.purchase_total ?? 0}`} />
        <StatCard label="Expenses" value={`₹ ${summary?.expense_total ?? 0}`} />
        <StatCard label="Net Profit" value={`₹ ${summary?.net_profit ?? 0}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        {canAddExpense ? <div className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Add Expense</h3>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createExpense.mutate({ ...form, amount: Number(form.amount) });
            }}
          >
            <input
              className="input"
              type="date"
              value={form.expense_date}
              onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))}
            />
            <input
              className="input"
              placeholder="Expense title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            />
            <select
              className="input"
              value={form.payment_method}
              onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}
            >
              {["cash", "card", "upi", "bank"].map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
            <textarea
              className="input min-h-24"
              placeholder="Notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
            <button className="btn-primary w-full">
              {createExpense.isPending ? "Saving..." : "Save Expense"}
            </button>
          </form>
        </div> : null}

        <TableCard title="Expense Register">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Created By</th>
              </tr>
            </thead>
            <tbody>
              {(expenses ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{row.expense_date}</td>
                  <td className="px-4 py-3">{row.title}</td>
                  <td className="px-4 py-3 uppercase">{row.payment_method}</td>
                  <td className="px-4 py-3">₹ {row.amount}</td>
                  <td className="px-4 py-3">{row.created_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </Layout>
  );
}
