import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function normalizeExpense(payload = {}) {
  return {
    expense_date: payload.expense_date ?? payload.expenseDate ?? new Date().toISOString().slice(0, 10),
    title: String(payload.title ?? "").trim(),
    amount: Number(payload.amount ?? 0),
    payment_method: String(payload.payment_method ?? payload.paymentMethod ?? "cash").toLowerCase(),
    notes: String(payload.notes ?? "").trim() || null,
  };
}

export async function listExpenses(filters = {}) {
  const params = [];
  const where = [];

  if (filters.date_from || filters.dateFrom) {
    where.push("expense_date >= ?");
    params.push(filters.date_from ?? filters.dateFrom);
  }

  if (filters.date_to || filters.dateTo) {
    where.push("expense_date <= ?");
    params.push(filters.date_to ?? filters.dateTo);
  }

  return query(
    `SELECT e.*, u.full_name AS created_by_name
     FROM expenses e
     JOIN users u ON u.id = e.created_by
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY e.expense_date DESC, e.id DESC`,
    params
  );
}

export async function createExpense(payload, user, ipAddress) {
  const data = normalizeExpense(payload);
  if (!data.title || data.amount <= 0) {
    throw new AppError("Expense title and a positive amount are required", 400);
  }

  const result = await query(
    `INSERT INTO expenses (expense_date, title, amount, payment_method, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.expense_date, data.title, data.amount, data.payment_method, data.notes, user.id]
  );

  await logAudit({
    userId: user.id,
    action: "CREATE",
    module: "EXPENSE",
    recordId: result.insertId,
    description: `Created expense ${data.title}`,
    ipAddress,
  });

  return query("SELECT * FROM expenses WHERE id = ? LIMIT 1", [result.insertId]).then((rows) => rows[0]);
}

export async function getAccountingSummary() {
  const [salesRows, purchaseRows, expenseRows] = await Promise.all([
    query("SELECT COALESCE(SUM(total_amount), 0) AS sales_total FROM sales"),
    query("SELECT COALESCE(SUM(total_amount), 0) AS purchase_total FROM purchase_orders WHERE status <> 'cancelled'"),
    query("SELECT COALESCE(SUM(amount), 0) AS expense_total FROM expenses"),
  ]);

  const salesTotal = Number(salesRows[0]?.sales_total || 0);
  const purchaseTotal = Number(purchaseRows[0]?.purchase_total || 0);
  const expenseTotal = Number(expenseRows[0]?.expense_total || 0);

  return {
    sales_total: salesTotal,
    purchase_total: purchaseTotal,
    expense_total: expenseTotal,
    net_profit: salesTotal - purchaseTotal - expenseTotal,
  };
}
