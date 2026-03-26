import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";

function normalizeCustomer(payload = {}) {
  return {
    customer_name: String(payload.customer_name ?? payload.customerName ?? payload.name ?? "").trim(),
    phone: String(payload.phone ?? "").trim() || null,
    email: String(payload.email ?? "").trim() || null,
    address: String(payload.address ?? "").trim() || null,
    status: payload.status === "inactive" ? "inactive" : "active",
  };
}

async function fetchCustomerList(search = "") {
  const where = [];
  const params = [];

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    where.push("(c.customer_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)");
    params.push(term, term, term);
  }

  return query(
    `SELECT c.id,
            c.customer_name,
            c.phone,
            c.email,
            c.address,
            c.loyalty_points,
            c.status,
            c.created_at,
            COALESCE(cs.sale_count, 0) AS sale_count,
            COALESCE(cs.lifetime_value, 0) AS lifetime_value
     FROM customers c
     LEFT JOIN (
       SELECT s.customer_id, COUNT(*) AS sale_count, COALESCE(SUM(s.total_amount), 0) AS lifetime_value
       FROM sales s
       GROUP BY s.customer_id
     ) cs ON cs.customer_id = c.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY c.customer_name ASC`,
    params,
  );
}

async function fetchCustomerById(id) {
  const rows = await query(
    `SELECT c.id, c.customer_name, c.phone, c.email, c.address, c.loyalty_points, c.status, c.created_at
     FROM customers c
     WHERE c.id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    throw new AppError("Customer not found", 404);
  }

  return rows[0];
}

export async function getCustomers(req, res, next) {
  try {
    const data = await fetchCustomerList(String(req.query.search ?? ""));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postCustomer(req, res, next) {
  try {
    const data = normalizeCustomer(req.body);
    if (!data.customer_name) {
      throw new AppError("Customer name is required", 400);
    }

    const result = await query(
      `INSERT INTO customers (customer_name, phone, email, address, status)
       VALUES (?, ?, ?, ?, ?)`,
      [data.customer_name, data.phone, data.email, data.address, data.status],
    );

    const customer = await fetchCustomerById(result.insertId);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function putCustomer(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await fetchCustomerById(id);
    const data = normalizeCustomer({ ...existing, ...req.body });

    if (!data.customer_name) {
      throw new AppError("Customer name is required", 400);
    }

    await query(
      `UPDATE customers
       SET customer_name = ?, phone = ?, email = ?, address = ?, status = ?
       WHERE id = ?`,
      [data.customer_name, data.phone, data.email, data.address, data.status, id],
    );

    const customer = await fetchCustomerById(id);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const id = Number(req.params.id);
    await fetchCustomerById(id);

    const sales = await query("SELECT id FROM sales WHERE customer_id = ? LIMIT 1", [id]);
    if (sales.length) {
      await query("UPDATE customers SET status = 'inactive' WHERE id = ?", [id]);
      return res.json({ success: true, data: { id, mode: "soft" } });
    }

    await query("DELETE FROM customers WHERE id = ?", [id]);
    return res.json({ success: true, data: { id, mode: "hard" } });
  } catch (error) {
    next(error);
  }
}
