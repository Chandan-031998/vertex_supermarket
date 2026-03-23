import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function normalizeCustomer(payload = {}) {
  return {
    customer_name: String(payload.customer_name ?? payload.customerName ?? payload.name ?? "").trim(),
    phone: String(payload.phone ?? "").trim() || null,
    email: String(payload.email ?? "").trim() || null,
    address: String(payload.address ?? "").trim() || null,
    status: payload.status === "inactive" ? "inactive" : "active",
  };
}

export async function listCustomers({ search = "" } = {}) {
  const params = [];
  const where = [];

  if (search) {
    where.push("(c.customer_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)");
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  return query(
    `SELECT c.*,
            COUNT(s.id) AS sale_count,
            COALESCE(SUM(s.total_amount), 0) AS lifetime_value
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY c.id
     ORDER BY c.customer_name ASC`,
    params
  );
}

export async function getCustomerById(id) {
  const rows = await query("SELECT * FROM customers WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) {
    throw new AppError("Customer not found", 404);
  }

  const [sales, loyalty] = await Promise.all([
    query(
      `SELECT s.id, s.invoice_no, s.sale_date, s.total_amount, s.bill_status, u.full_name AS cashier_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.cashier_id
       WHERE s.customer_id = ?
       ORDER BY s.sale_date DESC, s.id DESC`,
      [id]
    ),
    query(
      `SELECT *
       FROM loyalty_transactions
       WHERE customer_id = ?
       ORDER BY created_at DESC, id DESC`,
      [id]
    ),
  ]);

  return {
    ...rows[0],
    sales,
    loyalty_transactions: loyalty,
  };
}

export async function createCustomer(payload, user, ipAddress) {
  const data = normalizeCustomer(payload);
  if (!data.customer_name) {
    throw new AppError("Customer name is required", 400);
  }

  const result = await query(
    `INSERT INTO customers (customer_name, phone, email, address, status)
     VALUES (?, ?, ?, ?, ?)`,
    [data.customer_name, data.phone, data.email, data.address, data.status]
  );

  await logAudit({
    userId: user?.id,
    action: "CREATE",
    module: "CUSTOMER",
    recordId: result.insertId,
    description: `Created customer ${data.customer_name}`,
    ipAddress,
  });

  return getCustomerById(result.insertId);
}

export async function updateCustomer(id, payload, user, ipAddress) {
  const existing = await getCustomerById(id);
  const data = normalizeCustomer({ ...existing, ...payload });

  await query(
    `UPDATE customers
     SET customer_name = ?, phone = ?, email = ?, address = ?, status = ?
     WHERE id = ?`,
    [data.customer_name, data.phone, data.email, data.address, data.status, id]
  );

  await logAudit({
    userId: user?.id,
    action: "UPDATE",
    module: "CUSTOMER",
    recordId: id,
    description: `Updated customer ${data.customer_name}`,
    ipAddress,
  });

  return getCustomerById(id);
}

export async function deleteCustomer(id, user, ipAddress) {
  const existing = await getCustomerById(id);
  if ((existing.sales || []).length) {
    throw new AppError("Customer cannot be deleted because sales history exists", 400);
  }

  await query("DELETE FROM customers WHERE id = ?", [id]);

  await logAudit({
    userId: user?.id,
    action: "DELETE",
    module: "CUSTOMER",
    recordId: id,
    description: `Deleted customer ${existing.customer_name}`,
    ipAddress,
  });

  return { id };
}
