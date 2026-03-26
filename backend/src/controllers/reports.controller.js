import { query } from "../config/db.js";
import { getReportPack } from "../services/report.service.js";

function buildDateFilter(queryParams = {}) {
  const where = [];
  const params = [];

  if (queryParams.date_from || queryParams.dateFrom) {
    where.push("DATE(s.sale_date) >= ?");
    params.push(queryParams.date_from ?? queryParams.dateFrom);
  }

  if (queryParams.date_to || queryParams.dateTo) {
    where.push("DATE(s.sale_date) <= ?");
    params.push(queryParams.date_to ?? queryParams.dateTo);
  }

  return { where, params };
}

export async function getSalesSummary(req, res, next) {
  try {
    const { where, params } = buildDateFilter(req.query);
    const rows = await query(
      `SELECT
         COUNT(DISTINCT s.id) AS total_sales,
         COALESCE(SUM(s.total_amount), 0) AS total_revenue,
         COALESCE(SUM(si.quantity), 0) AS total_items_sold
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
      params,
    );

    res.json({ success: true, data: rows[0] ?? { total_sales: 0, total_revenue: 0, total_items_sold: 0 } });
  } catch (error) {
    next(error);
  }
}

export async function getSalesList(req, res, next) {
  try {
    const { where, params } = buildDateFilter(req.query);
    const data = await query(
      `SELECT
         s.id,
         s.invoice_no,
         COALESCE(c.customer_name, 'Walk-in') AS customer_name,
         u.full_name AS cashier_name,
         s.total_amount,
         s.sale_date
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.cashier_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY s.sale_date DESC, s.id DESC`,
      params,
    );

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getReportPackData(req, res, next) {
  try {
    const data = await getReportPack(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
