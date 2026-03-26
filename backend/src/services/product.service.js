import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function normalizeProduct(payload = {}) {
  return {
    category_id: payload.category_id ? Number(payload.category_id) : payload.categoryId ? Number(payload.categoryId) : null,
    brand_id: payload.brand_id ? Number(payload.brand_id) : payload.brandId ? Number(payload.brandId) : null,
    name: String(payload.name ?? "").trim(),
    sku: String(payload.sku ?? "").trim(),
    barcode: String(payload.barcode ?? "").trim() || null,
    unit: String(payload.unit ?? "pcs").trim() || "pcs",
    purchase_price: Number(payload.purchase_price ?? payload.purchasePrice ?? 0),
    selling_price: Number(payload.selling_price ?? payload.sellingPrice ?? 0),
    mrp: Number(payload.mrp ?? 0),
    gst_percent: Number(payload.gst_percent ?? payload.gstRate ?? 0),
    reorder_level: Number(payload.reorder_level ?? payload.reorderLevel ?? 0),
    track_batch: Boolean(payload.track_batch ?? payload.trackBatch),
    track_expiry: Boolean(payload.track_expiry ?? payload.trackExpiry),
    status: payload.status === "inactive" ? "inactive" : "active",
    image: String(payload.image ?? "").trim() || null,
  };
}

async function assertReferences(data) {
  if (!data.name || !data.sku) {
    throw new AppError("Product name and SKU are required", 400);
  }

  if (Number.isNaN(data.purchase_price) || Number.isNaN(data.selling_price) || Number.isNaN(data.mrp)) {
    throw new AppError("Product pricing values must be numeric", 400);
  }

  if (data.category_id) {
    const category = await query("SELECT id FROM categories WHERE id = ? LIMIT 1", [data.category_id]);
    if (!category.length) {
      throw new AppError("Selected category does not exist", 400);
    }
  }

  if (data.brand_id) {
    const brand = await query("SELECT id FROM brands WHERE id = ? LIMIT 1", [data.brand_id]);
    if (!brand.length) {
      throw new AppError("Selected brand does not exist", 400);
    }
  }
}

async function assertUnique(data, ignoreId = null) {
  const skuRows = await query(
    `SELECT id FROM products WHERE sku = ? ${ignoreId ? "AND id <> ?" : ""} LIMIT 1`,
    ignoreId ? [data.sku, ignoreId] : [data.sku]
  );

  if (skuRows.length) {
    throw new AppError("SKU already exists", 409);
  }

  if (data.barcode) {
    const barcodeRows = await query(
      `SELECT id FROM products WHERE barcode = ? ${ignoreId ? "AND id <> ?" : ""} LIMIT 1`,
      ignoreId ? [data.barcode, ignoreId] : [data.barcode]
    );

    if (barcodeRows.length) {
      throw new AppError("Barcode already exists", 409);
    }
  }
}

export async function listProducts(filters = {}) {
  const params = [];
  const where = [];

  if (filters.search) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)");
    const term = `%${filters.search.trim()}%`;
    params.push(term, term, term);
  }

  if (filters.status) {
    where.push("p.status = ?");
    params.push(filters.status);
  }

  if (filters.category_id || filters.categoryId) {
    where.push("p.category_id = ?");
    params.push(Number(filters.category_id ?? filters.categoryId));
  }

  if (filters.brand_id || filters.brandId) {
    where.push("p.brand_id = ?");
    params.push(Number(filters.brand_id ?? filters.brandId));
  }

  const rows = await query(
    `SELECT p.*,
            c.name AS category_name,
            b.name AS brand_name,
            i.id AS inventory_id,
            COALESCE(i.current_stock, 0) AS current_stock,
            COALESCE(i.reserved_stock, 0) AS reserved_stock,
            COALESCE(i.damaged_stock, 0) AS damaged_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN inventory i ON i.product_id = p.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY p.id DESC`,
    params
  );

  return rows;
}

export async function getProductById(id) {
  const rows = await query(
    `SELECT p.*,
            c.name AS category_name,
            b.name AS brand_name,
            COALESCE(i.current_stock, 0) AS current_stock,
            COALESCE(i.reserved_stock, 0) AS reserved_stock,
            COALESCE(i.damaged_stock, 0) AS damaged_stock
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows.length) {
    throw new AppError("Product not found", 404);
  }

  const batches = await query(
    `SELECT id, product_id, batch_no, expiry_date, purchase_price, selling_price, quantity
     FROM product_batches
     WHERE product_id = ?
     ORDER BY expiry_date IS NULL, expiry_date ASC, id DESC`,
    [id]
  );

  return {
    ...rows[0],
    batches,
  };
}

export async function createProduct(payload, user, ipAddress) {
  const data = normalizeProduct(payload);
  await assertReferences(data);
  await assertUnique(data);

  const result = await query(
    `INSERT INTO products (
      category_id, brand_id, name, sku, barcode, unit, purchase_price, selling_price, mrp,
      gst_percent, reorder_level, track_batch, track_expiry, status, image
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id,
      data.brand_id,
      data.name,
      data.sku,
      data.barcode,
      data.unit,
      data.purchase_price,
      data.selling_price,
      data.mrp,
      data.gst_percent,
      data.reorder_level,
      data.track_batch,
      data.track_expiry,
      data.status,
      data.image,
    ]
  );

  await query(
    `INSERT INTO inventory (product_id, current_stock, damaged_stock, reserved_stock)
     VALUES (?, 0, 0, 0)`,
    [result.insertId]
  );

  await logAudit({
    userId: user?.id,
    action: "CREATE",
    module: "PRODUCT",
    recordId: result.insertId,
    description: `Created product ${data.name} (${data.sku})`,
    ipAddress,
  });

  return getProductById(result.insertId);
}

export async function updateProduct(id, payload, user, ipAddress) {
  const existing = await getProductById(id);
  const data = normalizeProduct({ ...existing, ...payload });
  await assertReferences(data);
  await assertUnique(data, id);

  await query(
    `UPDATE products
     SET category_id = ?, brand_id = ?, name = ?, sku = ?, barcode = ?, unit = ?, purchase_price = ?,
         selling_price = ?, mrp = ?, gst_percent = ?, reorder_level = ?, track_batch = ?, track_expiry = ?,
         status = ?, image = ?
     WHERE id = ?`,
    [
      data.category_id,
      data.brand_id,
      data.name,
      data.sku,
      data.barcode,
      data.unit,
      data.purchase_price,
      data.selling_price,
      data.mrp,
      data.gst_percent,
      data.reorder_level,
      data.track_batch,
      data.track_expiry,
      data.status,
      data.image,
      id,
    ]
  );

  await logAudit({
    userId: user?.id,
    action: "UPDATE",
    module: "PRODUCT",
    recordId: id,
    description: `Updated product ${data.name} (${data.sku})`,
    ipAddress,
  });

  return getProductById(id);
}

export async function deleteProduct(id, user, ipAddress) {
  const existing = await getProductById(id);

  const saleUsage = await query("SELECT id FROM sale_items WHERE product_id = ? LIMIT 1", [id]);
  const purchaseUsage = await query("SELECT id FROM purchase_order_items WHERE product_id = ? LIMIT 1", [id]);

  if (saleUsage.length || purchaseUsage.length) {
    throw new AppError("Product cannot be deleted because transactional history exists", 400);
  }

  await query("DELETE FROM product_batches WHERE product_id = ?", [id]);
  await query("DELETE FROM inventory WHERE product_id = ?", [id]);
  await query("DELETE FROM products WHERE id = ?", [id]);

  await logAudit({
    userId: user?.id,
    action: "DELETE",
    module: "PRODUCT",
    recordId: id,
    description: `Deleted product ${existing.name} (${existing.sku})`,
    ipAddress,
  });

  return { id };
}

export async function searchSaleProducts(search = "") {
  const term = `%${search.trim()}%`;
  return query(
    `SELECT p.id, p.name, p.sku, p.barcode, p.unit, p.selling_price, p.mrp, p.gst_percent, p.track_batch, p.track_expiry,
            COALESCE(i.current_stock, 0) AS current_stock
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.status = 'active'
       AND (? = '%%' OR p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
     ORDER BY p.name ASC
     LIMIT 30`,
    [term, term, term, term]
  );
}
