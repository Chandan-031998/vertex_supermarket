import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import TableCard from "../components/TableCard";

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data.data,
  });

  const stats = [
    { label: "Total Products", value: data?.total_products ?? 0 },
    { label: "Total Customers", value: data?.total_customers ?? 0 },
    { label: "Total Suppliers", value: data?.total_suppliers ?? 0 },
    { label: "Total Sales", value: data?.total_sales ?? 0 },
    { label: "Today Sales", value: `₹ ${data?.today_sales ?? 0}` },
    { label: "Low Stock Items", value: data?.low_stock_count ?? 0 },
  ];

  return (
    <Layout title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TableCard title="Recent Sales">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_sales ?? []).length ? (
                (data?.recent_sales ?? []).map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">{row.invoice_no}</td>
                    <td className="px-4 py-3">{row.customer_name || "Walk-in"}</td>
                    <td className="px-4 py-3">{row.cashier_name}</td>
                    <td className="px-4 py-3">₹ {row.total_amount}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>No recent sales yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Low Stock Alerts">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Current</th>
                <th className="px-4 py-3">Reorder</th>
              </tr>
            </thead>
            <tbody>
              {(data?.low_stock_items ?? []).length ? (
                (data?.low_stock_items ?? []).map((row) => (
                  <tr key={row.sku} className="border-t border-slate-200">
                    <td className="px-4 py-3">{row.product_name}</td>
                    <td className="px-4 py-3">{row.sku}</td>
                    <td className="px-4 py-3">{row.current_stock}</td>
                    <td className="px-4 py-3">{row.reorder_level}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-slate-200">
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>No low-stock alerts.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>
      </div>
    </Layout>
  );
}
