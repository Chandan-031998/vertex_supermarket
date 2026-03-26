import pool, { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function round2(value) {
  return Number(Number(value).toFixed(2));
}

function generateCode(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${prefix}-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
}

function normalizeItems(items = []) {
  return items.map((item) => ({
    product_id: Number(item.product_id ?? item.productId),
    quantity: Number(item.quantity ?? 0),
    unit_price: round2(item.unit_price ?? item.unitPrice ?? 0),
    gst_percent: round2(item.gst_percent ?? item.gstPercent ?? item.taxRate ?? 0),
    batch_no: String(item.batch_no ?? item.batchNo ?? "").trim() || null,
    expiry_date: item.expiry_date ?? item.expiryDate ?? null,
  }));
}

async function getPurchaseHeader(connection, purchaseId) {
  const [headers] = await connection.execute(
    `SELECT po.*,
            s.supplier_name,
            s.phone AS supplier_phone,
            u.full_name AS ordered_by_name
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     JOIN users u ON u.id = po.ordered_by
     WHERE po.id = ?
     LIMIT 1`,
    [purchaseId]
  );

  if (!headers.length) {
    throw new AppError("Purchase order not found", 404);
  }

  const [items] = await connection.execute(
    `SELECT poi.*, p.name AS product_name, p.sku
     FROM purchase_order_items poi
     JOIN products p ON p.id = poi.product_id
     WHERE poi.purchase_order_id = ?
     ORDER BY poi.id ASC`,
    [purchaseId]
  );

  const [receipts] = await connection.execute(
    `SELECT gr.*, u.full_name AS received_by_name
     FROM goods_receipts gr
     JOIN users u ON u.id = gr.received_by
     WHERE gr.purchase_order_id = ?
     ORDER BY gr.received_date DESC, gr.id DESC`,
    [purchaseId]
  );

  const [payments] = await connection.execute(
    `SELECT sp.*
     FROM supplier_payments sp
     WHERE sp.purchase_order_id = ?
     ORDER BY sp.payment_date DESC, sp.id DESC`,
    [purchaseId]
  );

  return {
    ...headers[0],
    items,
    receipts,
    payments,
  };
}

async function assertSupplier(connection, supplierId) {
  const [suppliers] = await connection.execute("SELECT id, supplier_name FROM suppliers WHERE id = ? LIMIT 1", [supplierId]);
  if (!suppliers.length) {
    throw new AppError("Supplier not found", 404);
  }
}

export async function listPurchases(filters = {}) {
  const params = [];
  const where = [];

  if (filters.status) {
    where.push("po.status = ?");
    params.push(filters.status);
  }

  if (filters.supplier_id || filters.supplierId) {
    where.push("po.supplier_id = ?");
    params.push(Number(filters.supplier_id ?? filters.supplierId));
  }

  return query(
    `SELECT po.*,
            s.supplier_name,
            u.full_name AS ordered_by_name,
            COUNT(DISTINCT poi.id) AS item_count,
            COALESCE(SUM(sp.amount), 0) AS paid_amount
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     JOIN users u ON u.id = po.ordered_by
     LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
     LEFT JOIN supplier_payments sp ON sp.purchase_order_id = po.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY po.id, s.supplier_name, u.full_name
     ORDER BY po.order_date DESC, po.id DESC`,
    params
  );
}

export async function getPurchaseById(id) {
  const connection = await pool.getConnection();
  try {
    return await getPurchaseHeader(connection, id);
  } finally {
    connection.release();
  }
}

export async function createPurchase(payload, user, ipAddress) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const supplierId = Number(payload.supplier_id ?? payload.supplierId);
    const items = normalizeItems(payload.items || []);

    if (!supplierId) {
      throw new AppError("Supplier is required", 400);
    }

    if (!items.length) {
      throw new AppError("At least one purchase item is required", 400);
    }

    await assertSupplier(connection, supplierId);

    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = round2(payload.discount_amount ?? payload.discountAmount ?? 0);

    for (const item of items) {
      if (!item.product_id || item.quantity <= 0 || item.unit_price < 0) {
        throw new AppError("Purchase items must include product, quantity, and unit price", 400);
      }

      const [products] = await connection.execute("SELECT id FROM products WHERE id = ? LIMIT 1", [item.product_id]);
      if (!products.length) {
        throw new AppError(`Product ${item.product_id} was not found`, 404);
      }

      const base = round2(item.quantity * item.unit_price);
      subtotal += base;
      taxAmount += round2(base * (item.gst_percent / 100));
    }

    const totalAmount = round2(subtotal - discountAmount + taxAmount);
    const poNumber = generateCode("PO");

    const [headerResult] = await connection.execute(
      `INSERT INTO purchase_orders (
         po_number, supplier_id, ordered_by, order_date, status, subtotal, tax_amount, discount_amount, total_amount, notes
       )
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [
        poNumber,
        supplierId,
        user.id,
        payload.status ?? "pending",
        round2(subtotal),
        round2(taxAmount),
        discountAmount,
        totalAmount,
        payload.notes ?? null,
      ]
    );

    for (const item of items) {
      const lineBase = round2(item.quantity * item.unit_price);
      const lineTotal = round2(lineBase + lineBase * (item.gst_percent / 100));

      await connection.execute(
        `INSERT INTO purchase_order_items (
           purchase_order_id, product_id, quantity, unit_price, gst_percent, line_total, received_quantity
         )
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [headerResult.insertId, item.product_id, item.quantity, item.unit_price, item.gst_percent, lineTotal]
      );
    }

    await logAudit({
      connection,
      userId: user.id,
      action: "CREATE",
      module: "PURCHASE",
      recordId: headerResult.insertId,
      description: `Created purchase order ${poNumber}`,
      ipAddress,
    });

    await connection.commit();
    return getPurchaseHeader(connection, headerResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePurchaseStatus(id, status, user, ipAddress) {
  const allowed = new Set(["pending", "approved", "received", "cancelled"]);
  if (!allowed.has(status)) {
    throw new AppError("Invalid purchase status", 400);
  }

  await getPurchaseById(id);
  await query("UPDATE purchase_orders SET status = ? WHERE id = ?", [status, id]);

  await logAudit({
    userId: user.id,
    action: "STATUS",
    module: "PURCHASE",
    recordId: id,
    description: `Updated purchase status to ${status}`,
    ipAddress,
  });

  return getPurchaseById(id);
}

export async function receivePurchase(id, payload, user, ipAddress) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const purchase = await getPurchaseHeader(connection, id);
    if (purchase.status === "cancelled") {
      throw new AppError("Cancelled purchase orders cannot be received", 400);
    }

    const items = normalizeItems(payload.items || purchase.items);
    if (!items.length) {
      throw new AppError("At least one received item is required", 400);
    }

    const grnNumber = generateCode("GRN");
    const [grnResult] = await connection.execute(
      `INSERT INTO goods_receipts (purchase_order_id, received_by, grn_number, received_date, notes)
       VALUES (?, ?, ?, CURDATE(), ?)`,
      [id, user.id, grnNumber, payload.notes ?? null]
    );

    for (const item of items) {
      const purchaseItem = purchase.items.find((row) => row.product_id === item.product_id);
      if (!purchaseItem) {
        throw new AppError(`Product ${item.product_id} is not part of this purchase order`, 400);
      }

      const nextReceivedQty = Number(purchaseItem.received_quantity || 0) + item.quantity;
      if (nextReceivedQty > Number(purchaseItem.quantity)) {
        throw new AppError(`Received quantity exceeds ordered quantity for ${purchaseItem.product_name}`, 400);
      }

      await connection.execute(
        `UPDATE purchase_order_items
         SET received_quantity = ?
         WHERE id = ?`,
        [nextReceivedQty, purchaseItem.id]
      );

      await connection.execute(
        `UPDATE inventory
         SET current_stock = current_stock + ?
         WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );

      if (item.batch_no) {
        const [batchRows] = await connection.execute(
          `SELECT id, quantity
           FROM product_batches
           WHERE product_id = ? AND batch_no = ?
           LIMIT 1`,
          [item.product_id, item.batch_no]
        );

        if (batchRows.length) {
          await connection.execute(
            `UPDATE product_batches
             SET quantity = quantity + ?, expiry_date = COALESCE(?, expiry_date), purchase_price = ?, selling_price = ?
             WHERE id = ?`,
            [item.quantity, item.expiry_date, item.unit_price, item.unit_price, batchRows[0].id]
          );
        } else {
          await connection.execute(
            `INSERT INTO product_batches (product_id, batch_no, expiry_date, purchase_price, selling_price, quantity)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [item.product_id, item.batch_no, item.expiry_date, item.unit_price, item.unit_price, item.quantity]
          );
        }
      }

      await connection.execute(
        `INSERT INTO inventory_movements (
           product_id, movement_type, quantity, balance_after, notes, reference_type, reference_id, batch_no, expiry_date, created_by
         )
         VALUES (
           ?, 'purchase_receipt', ?, (SELECT current_stock FROM inventory WHERE product_id = ?),
           ?, 'goods_receipt', ?, ?, ?, ?
         )`,
        [
          item.product_id,
          item.quantity,
          item.product_id,
          `Received against ${purchase.po_number}`,
          grnResult.insertId,
          item.batch_no,
          item.expiry_date,
          user.id,
        ]
      );
    }

    const [receiptCheck] = await connection.execute(
      `SELECT SUM(quantity) AS ordered_qty, SUM(received_quantity) AS received_qty
       FROM purchase_order_items
       WHERE purchase_order_id = ?`,
      [id]
    );

    const nextStatus =
      Number(receiptCheck[0]?.received_qty || 0) >= Number(receiptCheck[0]?.ordered_qty || 0)
        ? "received"
        : "approved";

    await connection.execute("UPDATE purchase_orders SET status = ? WHERE id = ?", [nextStatus, id]);

    await logAudit({
      connection,
      userId: user.id,
      action: "RECEIVE",
      module: "PURCHASE",
      recordId: id,
      description: `Received goods for ${purchase.po_number} via ${grnNumber}`,
      ipAddress,
    });

    await connection.commit();
    return getPurchaseHeader(connection, id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function addSupplierPayment(id, payload, user, ipAddress) {
  const purchase = await getPurchaseById(id);
  const amount = round2(payload.amount ?? 0);

  if (amount <= 0) {
    throw new AppError("Payment amount must be greater than zero", 400);
  }

  const result = await query(
    `INSERT INTO supplier_payments (
       supplier_id, purchase_order_id, payment_method, amount, reference_no, notes, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      purchase.supplier_id,
      id,
      String(payload.payment_method ?? payload.paymentMethod ?? "cash").toLowerCase(),
      amount,
      String(payload.reference_no ?? payload.referenceNo ?? "").trim() || null,
      String(payload.notes ?? "").trim() || null,
      user.id,
    ]
  );

  await logAudit({
    userId: user.id,
    action: "PAYMENT",
    module: "PURCHASE",
    recordId: id,
    description: `Recorded supplier payment of ${amount} for ${purchase.po_number}`,
    ipAddress,
  });

  return {
    payment_id: result.insertId,
    purchase: await getPurchaseById(id),
  };
}
