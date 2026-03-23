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

export async function listCategories({ search = "", status = "" } = {}) {
  const params = [];
  const where = [];

  if (search) {
    where.push("c.name LIKE ?");
    params.push(`%${search.trim()}%`);
  }

  if (status) {
    where.push("c.status = ?");
    params.push(status);
  }

  const rows = await query(
    `SELECT c.*,
            COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY c.id
     ORDER BY c.name ASC`,
    params
  );

  return rows;
}

export async function getCategoryById(id) {
  const rows = await query(
    `SELECT c.*,
            COUNT(p.id) AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     WHERE c.id = ?
     GROUP BY c.id
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("Category not found", 404);
  }

  return rows[0];
}

export async function createCategory(payload, user, ipAddress) {
  const data = normalizePayload(payload);

  if (!data.name) {
    throw new AppError("Category name is required", 400);
  }

  const duplicate = await query("SELECT id FROM categories WHERE name = ? LIMIT 1", [data.name]);
  if (duplicate.length) {
    throw new AppError("Category already exists", 409);
  }

  const result = await query(
    `INSERT INTO categories (name, description, status)
     VALUES (?, ?, ?)`,
    [data.name, data.description, data.status]
  );

  await logAudit({
    userId: user?.id,
    action: "CREATE",
    module: "CATEGORY",
    recordId: result.insertId,
    description: `Created category ${data.name}`,
    ipAddress,
  });

  return getCategoryById(result.insertId);
}

export async function updateCategory(id, payload, user, ipAddress) {
  const existing = await getCategoryById(id);
  const data = normalizePayload({ ...existing, ...payload });

  if (!data.name) {
    throw new AppError("Category name is required", 400);
  }

  const duplicate = await query(
    "SELECT id FROM categories WHERE name = ? AND id <> ? LIMIT 1",
    [data.name, id]
  );

  if (duplicate.length) {
    throw new AppError("Category already exists", 409);
  }

  await query(
    `UPDATE categories
     SET name = ?, description = ?, status = ?
     WHERE id = ?`,
    [data.name, data.description, data.status, id]
  );

  await logAudit({
    userId: user?.id,
    action: "UPDATE",
    module: "CATEGORY",
    recordId: id,
    description: `Updated category ${data.name}`,
    ipAddress,
  });

  return getCategoryById(id);
}

export async function deleteCategory(id, user, ipAddress) {
  const existing = await getCategoryById(id);
  const productCount = Number(existing.product_count || 0);

  if (productCount > 0) {
    throw new AppError("Category cannot be deleted because products are linked to it", 400);
  }

  await query("DELETE FROM categories WHERE id = ?", [id]);

  await logAudit({
    userId: user?.id,
    action: "DELETE",
    module: "CATEGORY",
    recordId: id,
    description: `Deleted category ${existing.name}`,
    ipAddress,
  });

  return { id };
}
