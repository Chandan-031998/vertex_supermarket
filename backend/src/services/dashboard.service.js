import { query } from "../config/db.js";

export async function getDashboardSummary() {
  const [totals, recentSales, lowStock, topProducts] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*) FROM products) AS total_products,
         (SELECT COUNT(*) FROM customers) AS total_customers,
         (SELECT COUNT(*) FROM suppliers) AS total_suppliers,
         (SELECT COUNT(*) FROM sales) AS total_sales,
         (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(sale_date) = CURRENT_DATE) AS today_sales,
         (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE DATE(order_date) = CURRENT_DATE) AS today_purchases`
    ),
    query(
      `SELECT s.id, s.invoice_no, s.sale_date, s.total_amount, u.full_name AS cashier_name, c.customer_name
       FROM sales s
       JOIN users u ON u.id = s.cashier_id
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.sale_date DESC, s.id DESC
       LIMIT 10`
    ),
    query(
      `SELECT p.name AS product_name, p.sku, i.current_stock, p.reorder_level
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE p.reorder_level > 0 AND i.current_stock <= p.reorder_level
       ORDER BY i.current_stock ASC, p.name ASC
       LIMIT 10`
    ),
    query(
      `SELECT p.name AS product_name, p.sku, COALESCE(SUM(si.quantity), 0) AS sold_qty
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       GROUP BY p.id
       ORDER BY sold_qty DESC
       LIMIT 10`
    ),
  ]);

  return {
    ...(totals[0] ?? {}),
    low_stock_count: lowStock.length,
    recent_sales: recentSales,
    low_stock_items: lowStock,
    top_products: topProducts,
  };
}
