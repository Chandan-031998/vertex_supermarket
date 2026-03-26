import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";

function normalizeSupplier(payload = {}) {
  return {
    supplier_name: String(payload.supplier_name ?? payload.supplierName ?? payload.name ?? "").trim(),
    contact_person: String(payload.contact_person ?? payload.contactPerson ?? "").trim() || null,
    phone: String(payload.phone ?? "").trim() || null,
    email: String(payload.email ?? "").trim() || null,
    gst_no: String(payload.gst_no ?? payload.gstNo ?? "").trim() || null,
    address: String(payload.address ?? "").trim() || null,
    city: String(payload.city ?? "").trim() || null,
    state: String(payload.state ?? "").trim() || null,
    pincode: String(payload.pincode ?? "").trim() || null,
    status: payload.status === "inactive" ? "inactive" : "active",
  };
}

async function fetchSupplierList(search = "") {
  const where = [];
  const params = [];

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    where.push("(s.supplier_name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)");
    params.push(term, term, term);
  }

  return query(
    `SELECT s.id,
            s.supplier_name,
            s.contact_person,
            s.phone,
            s.email,
            s.gst_no,
            s.address,
            s.city,
            s.state,
            s.pincode,
            s.status,
            s.created_at,
            COALESCE(pt.purchase_total, 0) AS purchase_total,
            COALESCE(pp.paid_amount, 0) AS paid_amount,
            COALESCE(pt.purchase_total, 0) - COALESCE(pp.paid_amount, 0) AS pending_dues
     FROM suppliers s
     LEFT JOIN (
       SELECT po.supplier_id, COALESCE(SUM(po.total_amount), 0) AS purchase_total
       FROM purchase_orders po
       WHERE po.status <> 'cancelled'
       GROUP BY po.supplier_id
     ) pt ON pt.supplier_id = s.id
     LEFT JOIN (
       SELECT sp.supplier_id, COALESCE(SUM(sp.amount), 0) AS paid_amount
       FROM supplier_payments sp
       GROUP BY sp.supplier_id
     ) pp ON pp.supplier_id = s.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY s.supplier_name ASC`,
    params,
  );
}

async function fetchSupplierById(id) {
  const rows = await query(
    `SELECT id, supplier_name, contact_person, phone, email, gst_no, address, city, state, pincode, status, created_at
     FROM suppliers
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  if (!rows.length) {
    throw new AppError("Supplier not found", 404);
  }

  return rows[0];
}

export async function getSuppliers(req, res, next) {
  try {
    const data = await fetchSupplierList(String(req.query.search ?? ""));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postSupplier(req, res, next) {
  try {
    const data = normalizeSupplier(req.body);
    if (!data.supplier_name) {
      throw new AppError("Supplier name is required", 400);
    }

    const result = await query(
      `INSERT INTO suppliers (supplier_name, contact_person, phone, email, gst_no, address, city, state, pincode, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.supplier_name,
        data.contact_person,
        data.phone,
        data.email,
        data.gst_no,
        data.address,
        data.city,
        data.state,
        data.pincode,
        data.status,
      ],
    );

    const supplier = await fetchSupplierById(result.insertId);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function putSupplier(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await fetchSupplierById(id);
    const data = normalizeSupplier({ ...existing, ...req.body });

    if (!data.supplier_name) {
      throw new AppError("Supplier name is required", 400);
    }

    await query(
      `UPDATE suppliers
       SET supplier_name = ?, contact_person = ?, phone = ?, email = ?, gst_no = ?, address = ?, city = ?, state = ?, pincode = ?, status = ?
       WHERE id = ?`,
      [
        data.supplier_name,
        data.contact_person,
        data.phone,
        data.email,
        data.gst_no,
        data.address,
        data.city,
        data.state,
        data.pincode,
        data.status,
        id,
      ],
    );

    const supplier = await fetchSupplierById(id);
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
}

export async function deleteSupplier(req, res, next) {
  try {
    const id = Number(req.params.id);
    await fetchSupplierById(id);

    const purchases = await query("SELECT id FROM purchase_orders WHERE supplier_id = ? LIMIT 1", [id]);
    if (purchases.length) {
      await query("UPDATE suppliers SET status = 'inactive' WHERE id = ?", [id]);
      return res.json({ success: true, data: { id, mode: "soft" } });
    }

    await query("DELETE FROM suppliers WHERE id = ?", [id]);
    return res.json({ success: true, data: { id, mode: "hard" } });
  } catch (error) {
    next(error);
  }
}
