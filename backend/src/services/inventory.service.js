import pool, { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function normalizeAdjustment(payload = {}) {
  return {
    product_id: Number(payload.product_id ?? payload.productId),
    movement_type: String(payload.movement_type ?? payload.movementType ?? "").trim().toLowerCase(),
    quantity: Number(payload.quantity ?? 0),
    notes: String(payload.notes ?? "").trim() || null,
    batch_no: String(payload.batch_no ?? payload.batchNo ?? "").trim() || null,
    expiry_date: payload.expiry_date ?? payload.expiryDate ?? null,
    purchase_price: Number(payload.purchase_price ?? payload.purchasePrice ?? 0),
    selling_price: Number(payload.selling_price ?? payload.sellingPrice ?? 0),
  };
}

function getMovementEffect(type, quantity) {
  if (quantity <= 0 && type !== "adjustment") {
    throw new AppError("Quantity must be greater than zero", 400);
  }

  switch (type) {
    case "stock_in":
      return { stockDelta: quantity, damagedDelta: 0 };
    case "stock_out":
      return { stockDelta: -quantity, damagedDelta: 0 };
    case "damage":
      return { stockDelta: -quantity, damagedDelta: quantity };
    case "adjustment":
      return { stockDelta: quantity, damagedDelta: 0 };
    default:
      throw new AppError("Unsupported inventory movement type", 400);
  }
}

async function getInventoryRow(productId) {
  const rows = await query(
    `SELECT i.*, p.name AS product_name, p.sku, p.reorder_level, p.track_batch, p.track_expiry
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     WHERE i.product_id = ?
     LIMIT 1`,
    [productId]
  );

  if (!rows.length) {
    throw new AppError("Inventory record not found for selected product", 404);
  }

  return rows[0];
}

export async function getInventoryOverview() {
  const [summaryRows, lowStockRows, expiryRows] = await Promise.all([
    query(
      `SELECT
         COUNT(*) AS total_products,
         SUM(CASE WHEN COALESCE(i.current_stock, 0) <= COALESCE(p.reorder_level, 0) AND COALESCE(p.reorder_level, 0) > 0 THEN 1 ELSE 0 END) AS low_stock_count,
         SUM(COALESCE(i.current_stock, 0)) AS total_units,
         SUM(COALESCE(i.damaged_stock, 0)) AS damaged_units
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id`
    ),
    listLowStock(),
    listExpiryAlerts({ days: 30 }),
  ]);

  return {
    summary: summaryRows[0] ?? {
      total_products: 0,
      low_stock_count: 0,
      total_units: 0,
      damaged_units: 0,
    },
    low_stock: lowStockRows,
    expiry_alerts: expiryRows,
  };
}

export async function listInventory(filters = {}) {
  const params = [];
  const where = [];

  if (filters.search) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)");
    const term = `%${filters.search.trim()}%`;
    params.push(term, term, term);
  }

  if (filters.category_id || filters.categoryId) {
    where.push("p.category_id = ?");
    params.push(Number(filters.category_id ?? filters.categoryId));
  }

  const rows = await query(
    `SELECT i.*,
            p.name AS product_name,
            p.sku,
            p.barcode,
            p.unit,
            p.status AS product_status,
            p.reorder_level,
            p.track_batch,
            p.track_expiry,
            c.name AS category_name,
            b.name AS brand_name,
            (
              SELECT MIN(pb.expiry_date)
              FROM product_batches pb
              WHERE pb.product_id = p.id AND pb.quantity > 0 AND pb.expiry_date IS NOT NULL
            ) AS nearest_expiry,
            (
              SELECT COUNT(*)
              FROM product_batches pb
              WHERE pb.product_id = p.id AND pb.quantity > 0
            ) AS batch_count
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY p.name ASC`,
    params
  );

  return rows;
}

export async function listLowStock() {
  return query(
    `SELECT i.*, p.name AS product_name, p.sku, p.reorder_level, c.name AS category_name
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.reorder_level > 0 AND i.current_stock <= p.reorder_level
     ORDER BY (p.reorder_level - i.current_stock) DESC, p.name ASC`
  );
}

export async function listExpiryAlerts({ days = 30 } = {}) {
  return query(
    `SELECT pb.*, p.name AS product_name, p.sku
     FROM product_batches pb
     JOIN products p ON p.id = pb.product_id
     WHERE pb.quantity > 0
       AND pb.expiry_date IS NOT NULL
       AND pb.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY pb.expiry_date ASC, p.name ASC`,
    [Number(days)]
  );
}

export async function listInventoryMovements({ product_id, limit = 100 } = {}) {
  const params = [];
  const where = [];

  if (product_id) {
    where.push("im.product_id = ?");
    params.push(Number(product_id));
  }

  params.push(Number(limit));

  return query(
    `SELECT im.*,
            p.name AS product_name,
            p.sku,
            u.full_name AS user_name
     FROM inventory_movements im
     JOIN products p ON p.id = im.product_id
     LEFT JOIN users u ON u.id = im.created_by
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY im.created_at DESC
     LIMIT ?`,
    params
  );
}

export async function createInventoryAdjustment(payload, user, ipAddress) {
  const data = normalizeAdjustment(payload);

  if (!data.product_id || Number.isNaN(data.product_id)) {
    throw new AppError("Product is required", 400);
  }

  const inventory = await getInventoryRow(data.product_id);
  const { stockDelta, damagedDelta } = getMovementEffect(data.movement_type, data.quantity);

  if (inventory.current_stock + stockDelta < 0) {
    throw new AppError("Insufficient current stock for this adjustment", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE inventory
       SET current_stock = current_stock + ?, damaged_stock = damaged_stock + ?
       WHERE product_id = ?`,
      [stockDelta, damagedDelta, data.product_id]
    );

    const [adjustmentResult] = await connection.execute(
      `INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, notes, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [data.product_id, data.movement_type, data.quantity, data.notes, user?.id ?? null]
    );

    await connection.execute(
      `INSERT INTO inventory_movements (
         product_id, movement_type, quantity, balance_after, notes, reference_type, reference_id, batch_no, expiry_date, created_by
       )
       VALUES (
         ?, ?, ?, (SELECT current_stock FROM inventory WHERE product_id = ?), ?, ?, ?, ?, ?, ?
       )`,
      [
        data.product_id,
        data.movement_type,
        stockDelta,
        data.product_id,
        data.notes,
        "stock_adjustment",
        adjustmentResult.insertId,
        data.batch_no,
        data.expiry_date,
        user?.id ?? null,
      ]
    );

    if ((inventory.track_batch || inventory.track_expiry) && data.batch_no) {
      const [batchRows] = await connection.execute(
        `SELECT id, quantity
         FROM product_batches
         WHERE product_id = ? AND batch_no = ?
         LIMIT 1`,
        [data.product_id, data.batch_no]
      );

      if (batchRows.length) {
        const batch = batchRows[0];
        const nextQuantity = Number(batch.quantity) + stockDelta;

        if (nextQuantity < 0) {
          throw new AppError("Insufficient batch stock for this adjustment", 400);
        }

        await connection.execute(
          `UPDATE product_batches
           SET quantity = ?, expiry_date = COALESCE(?, expiry_date), purchase_price = ?, selling_price = ?
           WHERE id = ?`,
          [nextQuantity, data.expiry_date, data.purchase_price, data.selling_price, batch.id]
        );
      } else if (stockDelta > 0) {
        await connection.execute(
          `INSERT INTO product_batches (product_id, batch_no, expiry_date, purchase_price, selling_price, quantity)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            data.product_id,
            data.batch_no,
            data.expiry_date,
            data.purchase_price,
            data.selling_price,
            stockDelta,
          ]
        );
      }
    }

    await logAudit({
      connection,
      userId: user?.id,
      action: "ADJUST",
      module: "INVENTORY",
      recordId: data.product_id,
      description: `Inventory ${data.movement_type} for ${inventory.product_name} by ${data.quantity}`,
      ipAddress,
    });

    await connection.commit();

    return getInventoryRow(data.product_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
