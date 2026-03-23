import { query } from "../config/db.js";

function rangeFilters(queryParams = {}, column) {
  const params = [];
  const where = [];

  if (queryParams.date_from || queryParams.dateFrom) {
    where.push(`DATE(${column}) >= ?`);
    params.push(queryParams.date_from ?? queryParams.dateFrom);
  }

  if (queryParams.date_to || queryParams.dateTo) {
    where.push(`DATE(${column}) <= ?`);
    params.push(queryParams.date_to ?? queryParams.dateTo);
  }

  return { where, params };
}

export async function getSalesSummary(filters = {}) {
  const { where, params } = rangeFilters(filters, "s.sale_date");
  const rows = await query(
    `SELECT
       COUNT(*) AS total_invoices,
       COALESCE(SUM(s.total_amount), 0) AS total_revenue,
       COALESCE(SUM(s.tax_amount), 0) AS total_tax,
       COALESCE(SUM(s.discount_amount), 0) AS total_discount
     FROM sales s
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
    params
  );

  return rows[0];
}

export async function getReportPack(filters = {}) {
  const salesFilter = rangeFilters(filters, "s.sale_date");
  const purchaseFilter = rangeFilters(filters, "po.order_date");
  const expenseFilter = rangeFilters(filters, "e.expense_date");

  const [
    salesSummary,
    dailySales,
    categorySales,
    productSales,
    paymentAnalysis,
    purchaseRegister,
    stockReport,
    lowStockReport,
    expiryReport,
    topProducts,
    purchaseSummaryRows,
    expenseSummaryRows,
  ] = await Promise.all([
    getSalesSummary(filters),
    query(
      `SELECT DATE(s.sale_date) AS report_date,
              COUNT(*) AS invoice_count,
              COALESCE(SUM(s.total_amount), 0) AS total_amount
       FROM sales s
       ${salesFilter.where.length ? `WHERE ${salesFilter.where.join(" AND ")}` : ""}
       GROUP BY DATE(s.sale_date)
       ORDER BY report_date DESC
       LIMIT 31`,
      salesFilter.params
    ),
    query(
      `SELECT c.name AS category_name,
              COALESCE(SUM(si.quantity), 0) AS total_qty,
              COALESCE(SUM(si.line_total), 0) AS total_sales
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       ${salesFilter.where.length ? `WHERE ${salesFilter.where.join(" AND ")}` : ""}
       GROUP BY c.id
       ORDER BY total_sales DESC`
      ,
      salesFilter.params
    ),
    query(
      `SELECT p.name AS product_name, p.sku,
              COALESCE(SUM(si.quantity), 0) AS total_qty,
              COALESCE(SUM(si.line_total), 0) AS total_sales
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       ${salesFilter.where.length ? `WHERE ${salesFilter.where.join(" AND ")}` : ""}
       GROUP BY p.id
       ORDER BY total_sales DESC`,
      salesFilter.params
    ),
    query(
      `SELECT sp.payment_method,
              COUNT(*) AS payment_count,
              COALESCE(SUM(sp.amount), 0) AS total_amount
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       ${salesFilter.where.length ? `WHERE ${salesFilter.where.join(" AND ")}` : ""}
       GROUP BY sp.payment_method
       ORDER BY total_amount DESC`,
      salesFilter.params
    ),
    query(
      `SELECT po.po_number, po.order_date, po.status, po.total_amount, s.supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       ${purchaseFilter.where.length ? `WHERE ${purchaseFilter.where.join(" AND ")}` : ""}
       ORDER BY po.order_date DESC, po.id DESC`,
      purchaseFilter.params
    ),
    query(
      `SELECT p.name AS product_name, p.sku, i.current_stock, i.damaged_stock, i.reserved_stock, p.reorder_level
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       ORDER BY p.name ASC`
    ),
    query(
      `SELECT p.name AS product_name, p.sku, i.current_stock, p.reorder_level
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE p.reorder_level > 0 AND i.current_stock <= p.reorder_level
       ORDER BY i.current_stock ASC, p.name ASC`
    ),
    query(
      `SELECT pb.batch_no, pb.expiry_date, pb.quantity, p.name AS product_name, p.sku
       FROM product_batches pb
       JOIN products p ON p.id = pb.product_id
       WHERE pb.quantity > 0
         AND pb.expiry_date IS NOT NULL
       ORDER BY pb.expiry_date ASC`
    ),
    query(
      `SELECT p.name AS product_name, p.sku,
              COALESCE(SUM(si.quantity), 0) AS total_qty,
              COALESCE(SUM(si.line_total), 0) AS total_sales
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       ${salesFilter.where.length ? `WHERE ${salesFilter.where.join(" AND ")}` : ""}
       GROUP BY p.id
       ORDER BY total_qty DESC
       LIMIT 10`,
      salesFilter.params
    ),
    query(
      `SELECT COALESCE(SUM(po.total_amount), 0) AS purchase_total
       FROM purchase_orders po
       ${purchaseFilter.where.length ? `WHERE ${purchaseFilter.where.join(" AND ")}` : ""}`,
      purchaseFilter.params
    ),
    query(
      `SELECT COALESCE(SUM(e.amount), 0) AS expense_total
       FROM expenses e
       ${expenseFilter.where.length ? `WHERE ${expenseFilter.where.join(" AND ")}` : ""}`,
      expenseFilter.params
    ),
  ]);

  const purchaseTotal = Number(purchaseSummaryRows[0]?.purchase_total || 0);
  const expenseTotal = Number(expenseSummaryRows[0]?.expense_total || 0);
  const revenue = Number(salesSummary.total_revenue || 0);

  return {
    sales_summary: salesSummary,
    daily_sales: dailySales,
    category_sales: categorySales,
    product_sales: productSales,
    payment_analysis: paymentAnalysis,
    purchase_register: purchaseRegister,
    stock_report: stockReport,
    low_stock_report: lowStockReport,
    expiry_report: expiryReport,
    top_products: topProducts,
    gst_report: {
      output_tax: Number(salesSummary.total_tax || 0),
      input_tax: purchaseTotal ? purchaseRegister.reduce((sum, row) => sum + Number(row.tax_amount || 0), 0) : 0,
      net_tax: Number(salesSummary.total_tax || 0) - purchaseRegister.reduce((sum, row) => sum + Number(row.tax_amount || 0), 0),
    },
    profit_loss: {
      revenue,
      purchase_total: purchaseTotal,
      expense_total: expenseTotal,
      gross_profit: revenue - purchaseTotal,
      net_profit: revenue - purchaseTotal - expenseTotal,
    },
  };
}
