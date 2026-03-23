import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function normalizeSupplier(payload = {}) {
  return {
    supplier_name: String(payload.supplier_name ?? payload.supplierName ?? payload.name ?? "").trim(),
    contact_person: String(payload.contact_person ?? payload.contactPerson ?? "").trim() || null,
    phone: String(payload.phone ?? "").trim() || null,
    email: String(payload.email ?? "").trim() || null,
    gst_no: String(payload.gst_no ?? payload.gstNo ?? payload.gstNumber ?? "").trim() || null,
    address: String(payload.address ?? "").trim() || null,
    city: String(payload.city ?? "").trim() || null,
    state: String(payload.state ?? "").trim() || null,
    pincode: String(payload.pincode ?? "").trim() || null,
    status: payload.status === "inactive" ? "inactive" : "active",
  };
}

export async function listSuppliers({ search = "" } = {}) {
  const params = [];
  const where = [];

  if (search) {
    where.push("(s.supplier_name LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)");
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  return query(
    `SELECT s.*,
            COALESCE(SUM(po.total_amount), 0) AS purchase_total,
            COALESCE((
              SELECT SUM(sp.amount)
              FROM supplier_payments sp
              WHERE sp.supplier_id = s.id
            ), 0) AS paid_amount,
            COALESCE(SUM(po.total_amount), 0) - COALESCE((
              SELECT SUM(sp.amount)
              FROM supplier_payments sp
              WHERE sp.supplier_id = s.id
            ), 0) AS pending_dues
     FROM suppliers s
     LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.status <> 'cancelled'
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY s.id
     ORDER BY s.supplier_name ASC`,
    params
  );
}

export async function getSupplierById(id) {
  const rows = await query("SELECT * FROM suppliers WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) {
    throw new AppError("Supplier not found", 404);
  }

  const purchases = await query(
    `SELECT po.*,
            COALESCE(SUM(sp.amount), 0) AS paid_amount
     FROM purchase_orders po
     LEFT JOIN supplier_payments sp ON sp.purchase_order_id = po.id
     WHERE po.supplier_id = ?
     GROUP BY po.id
     ORDER BY po.order_date DESC, po.id DESC`,
    [id]
  );

  return {
    ...rows[0],
    purchases,
  };
}

export async function createSupplier(payload, user, ipAddress) {
  const data = normalizeSupplier(payload);

  if (!data.supplier_name) {
    throw new AppError("Supplier name is required", 400);
  }

  const result = await query(
    `INSERT INTO suppliers (
       supplier_name, contact_person, phone, email, gst_no, address, city, state, pincode, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ]
  );

  await logAudit({
    userId: user?.id,
    action: "CREATE",
    module: "SUPPLIER",
    recordId: result.insertId,
    description: `Created supplier ${data.supplier_name}`,
    ipAddress,
  });

  return getSupplierById(result.insertId);
}

export async function updateSupplier(id, payload, user, ipAddress) {
  const existing = await getSupplierById(id);
  const data = normalizeSupplier({ ...existing, ...payload });

  if (!data.supplier_name) {
    throw new AppError("Supplier name is required", 400);
  }

  await query(
    `UPDATE suppliers
     SET supplier_name = ?, contact_person = ?, phone = ?, email = ?, gst_no = ?, address = ?,
         city = ?, state = ?, pincode = ?, status = ?
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
    ]
  );

  await logAudit({
    userId: user?.id,
    action: "UPDATE",
    module: "SUPPLIER",
    recordId: id,
    description: `Updated supplier ${data.supplier_name}`,
    ipAddress,
  });

  return getSupplierById(id);
}

export async function deleteSupplier(id, user, ipAddress) {
  const existing = await getSupplierById(id);
  if ((existing.purchases || []).length) {
    throw new AppError("Supplier cannot be deleted because purchase history exists", 400);
  }

  await query("DELETE FROM suppliers WHERE id = ?", [id]);

  await logAudit({
    userId: user?.id,
    action: "DELETE",
    module: "SUPPLIER",
    recordId: id,
    description: `Deleted supplier ${existing.supplier_name}`,
    ipAddress,
  });

  return { id };
}
