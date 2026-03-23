import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function normalizePayload(payload = {}) {
  return {
    name: String(payload.name ?? "").trim(),
    description: String(payload.description ?? "").trim() || null,
    status: payload.status === "inactive" ? "inactive" : "active",
  };
}

export async function listBrands({ search = "", status = "" } = {}) {
  const params = [];
  const where = [];

  if (search) {
    where.push("b.name LIKE ?");
    params.push(`%${search.trim()}%`);
  }

  if (status) {
    where.push("b.status = ?");
    params.push(status);
  }

  const rows = await query(
    `SELECT b.*,
            COUNT(p.id) AS product_count
     FROM brands b
     LEFT JOIN products p ON p.brand_id = b.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY b.id
     ORDER BY b.name ASC`,
    params
  );

  return rows;
}

export async function getBrandById(id) {
  const rows = await query(
    `SELECT b.*,
            COUNT(p.id) AS product_count
     FROM brands b
     LEFT JOIN products p ON p.brand_id = b.id
     WHERE b.id = ?
     GROUP BY b.id
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("Brand not found", 404);
  }

  return rows[0];
}

export async function createBrand(payload, user, ipAddress) {
  const data = normalizePayload(payload);

  if (!data.name) {
    throw new AppError("Brand name is required", 400);
  }

  const duplicate = await query("SELECT id FROM brands WHERE name = ? LIMIT 1", [data.name]);
  if (duplicate.length) {
    throw new AppError("Brand already exists", 409);
  }

  const result = await query(
    `INSERT INTO brands (name, description, status)
     VALUES (?, ?, ?)`,
    [data.name, data.description, data.status]
  );

  await logAudit({
    userId: user?.id,
    action: "CREATE",
    module: "BRAND",
    recordId: result.insertId,
    description: `Created brand ${data.name}`,
    ipAddress,
  });

  return getBrandById(result.insertId);
}

export async function updateBrand(id, payload, user, ipAddress) {
  const existing = await getBrandById(id);
  const data = normalizePayload({ ...existing, ...payload });

  if (!data.name) {
    throw new AppError("Brand name is required", 400);
  }

  const duplicate = await query("SELECT id FROM brands WHERE name = ? AND id <> ? LIMIT 1", [data.name, id]);
  if (duplicate.length) {
    throw new AppError("Brand already exists", 409);
  }

  await query(
    `UPDATE brands
     SET name = ?, description = ?, status = ?
     WHERE id = ?`,
    [data.name, data.description, data.status, id]
  );

  await logAudit({
    userId: user?.id,
    action: "UPDATE",
    module: "BRAND",
    recordId: id,
    description: `Updated brand ${data.name}`,
    ipAddress,
  });

  return getBrandById(id);
}

export async function deleteBrand(id, user, ipAddress) {
  const existing = await getBrandById(id);

  if (Number(existing.product_count || 0) > 0) {
    throw new AppError("Brand cannot be deleted because products are linked to it", 400);
  }

  await query("DELETE FROM brands WHERE id = ?", [id]);

  await logAudit({
    userId: user?.id,
    action: "DELETE",
    module: "BRAND",
    recordId: id,
    description: `Deleted brand ${existing.name}`,
    ipAddress,
  });

  return { id };
}
