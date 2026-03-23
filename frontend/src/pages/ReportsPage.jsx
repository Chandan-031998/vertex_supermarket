import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import TableCard from "../components/TableCard";

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    date_from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    date_to: new Date().toISOString().slice(0, 10),
  });

  const queryString = useMemo(() => new URLSearchParams(filters).toString(), [filters]);

  const { data } = useQuery({
    queryKey: ["reports-pack", queryString],
    queryFn: async () => (await api.get(`/reports/pack?${queryString}`)).data.data,
  });

  return (
    <Layout title="Reports">
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="input" type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
          <input className="input" type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={`₹ ${data?.sales_summary?.total_revenue ?? 0}`} />
        <StatCard label="Invoices" value={data?.sales_summary?.total_invoices ?? 0} />
        <StatCard label="GST Output" value={`₹ ${data?.gst_report?.output_tax ?? 0}`} />
        <StatCard label="Net Profit" value={`₹ ${data?.profit_loss?.net_profit ?? 0}`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TableCard title="Daily Sales Report">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoices</th>
                <th className="px-4 py-3">Sales</th>
              </tr>
            </thead>
            <tbody>
              {(data?.daily_sales ?? []).map((row) => (
                <tr key={row.report_date} className="border-t border-slate-200">
                  <td className="px-4 py-3">{row.report_date}</td>
                  <td className="px-4 py-3">{row.invoice_count}</td>
                  <td className="px-4 py-3">₹ {row.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Payment Analysis">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.payment_analysis ?? []).map((row) => (
                <tr key={row.payment_method} className="border-t border-slate-200">
                  <td className="px-4 py-3 uppercase">{row.payment_method}</td>
                  <td className="px-4 py-3">{row.payment_count}</td>
                  <td className="px-4 py-3">₹ {row.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Category-wise Sales">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Sales</th>
              </tr>
            </thead>
            <tbody>
              {(data?.category_sales ?? []).map((row) => (
                <tr key={row.category_name || "uncategorized"} className="border-t border-slate-200">
                  <td className="px-4 py-3">{row.category_name || "Uncategorized"}</td>
                  <td className="px-4 py-3">{row.total_qty}</td>
                  <td className="px-4 py-3">₹ {row.total_sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Top Selling Products">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Sales</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_products ?? []).map((row) => (
                <tr key={row.sku} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div>{row.product_name}</div>
                    <div className="text-xs text-slate-500">{row.sku}</div>
                  </td>
                  <td className="px-4 py-3">{row.total_qty}</td>
                  <td className="px-4 py-3">₹ {row.total_sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TableCard title="Purchase Register">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">PO No</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data?.purchase_register ?? []).map((row) => (
                <tr key={row.po_number} className="border-t border-slate-200">
                  <td className="px-4 py-3">{row.po_number}</td>
                  <td className="px-4 py-3">{row.supplier_name}</td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                  <td className="px-4 py-3">₹ {row.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Low Stock & Expiry">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-700">Low Stock</div>
              <div className="space-y-2 text-sm">
                {(data?.low_stock_report ?? []).slice(0, 8).map((row) => (
                  <div key={row.sku} className="rounded-xl border border-slate-200 px-3 py-2">
                    <div className="font-medium text-slate-900">{row.product_name}</div>
                    <div className="text-slate-500">{row.current_stock} left • reorder {row.reorder_level}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-700">Expiry</div>
              <div className="space-y-2 text-sm">
                {(data?.expiry_report ?? []).slice(0, 8).map((row) => (
                  <div key={row.batch_no || `${row.product_name}-${row.expiry_date}`} className="rounded-xl border border-slate-200 px-3 py-2">
                    <div className="font-medium text-slate-900">{row.product_name}</div>
                    <div className="text-slate-500">Batch {row.batch_no || "-"} • {row.expiry_date || "-"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TableCard>
      </div>
    </Layout>
  );
}
