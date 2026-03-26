import pool, { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

function round2(value) {
  return Number(Number(value).toFixed(2));
}

function generateInvoice(prefix) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${prefix}-${stamp}-${Math.floor(Math.random() * 900 + 100)}`;
}

function normalizePayments(payments = []) {
  return payments
    .filter((payment) => Number(payment.amount) > 0)
    .map((payment) => ({
      payment_method: String(payment.payment_method ?? payment.paymentMethod ?? "").trim().toLowerCase(),
      amount: round2(payment.amount),
      reference_no: String(payment.reference_no ?? payment.referenceNo ?? "").trim() || null,
    }));
}

async function getSaleHeader(connection, saleId) {
  const [sales] = await connection.execute(
    `SELECT s.*,
            c.customer_name,
            c.phone AS customer_phone,
            c.email AS customer_email,
            u.full_name AS cashier_name
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     JOIN users u ON u.id = s.cashier_id
     WHERE s.id = ?
     LIMIT 1`,
    [saleId]
  );

  if (!sales.length) {
    throw new AppError("Sale not found", 404);
  }

  const [items] = await connection.execute(
    `SELECT si.*, p.name AS product_name, p.sku, p.barcode
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?
     ORDER BY si.id ASC`,
    [saleId]
  );

  const [payments] = await connection.execute(
    `SELECT *
     FROM sale_payments
     WHERE sale_id = ?
     ORDER BY id ASC`,
    [saleId]
  );

  const [returns] = await connection.execute(
    `SELECT sr.*, u.full_name AS processed_by_name
     FROM sale_returns sr
     LEFT JOIN users u ON u.id = sr.processed_by
     WHERE sr.sale_id = ?
     ORDER BY sr.created_at DESC`,
    [saleId]
  );

  return {
    ...sales[0],
    items,
    payments,
    returns,
  };
}

async function ensureCustomer(connection, customerId) {
  if (!customerId) {
    return null;
  }

  const [rows] = await connection.execute("SELECT * FROM customers WHERE id = ? LIMIT 1", [customerId]);
  if (!rows.length) {
    throw new AppError("Customer not found", 404);
  }

  return rows[0];
}

async function calculateCart(connection, items = []) {
  if (!items.length) {
    throw new AppError("At least one cart item is required", 400);
  }

  const normalizedItems = [];
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  for (const rawItem of items) {
    const productId = Number(rawItem.product_id ?? rawItem.productId);
    const quantity = Number(rawItem.quantity ?? 0);
    const itemDiscount = round2(rawItem.discount_amount ?? rawItem.discountAmount ?? 0);
    const batchId = rawItem.batch_id ?? rawItem.batchId ?? null;

    if (!productId || quantity <= 0) {
      throw new AppError("Each cart item must include a valid product and quantity", 400);
    }

    const [productRows] = await connection.execute(
      `SELECT p.*, COALESCE(i.current_stock, 0) AS current_stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.id = ? AND p.status = 'active'
       LIMIT 1`,
      [productId]
    );

    if (!productRows.length) {
      throw new AppError(`Product not found for item ${productId}`, 404);
    }

    const product = productRows[0];

    if (Number(product.current_stock) < quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }

    if (batchId) {
      const [batchRows] = await connection.execute(
        "SELECT id, quantity FROM product_batches WHERE id = ? AND product_id = ? LIMIT 1",
        [batchId, productId]
      );

      if (!batchRows.length || Number(batchRows[0].quantity) < quantity) {
        throw new AppError(`Insufficient batch stock for ${product.name}`, 400);
      }
    }

    const lineBase = round2(quantity * Number(product.selling_price));
    const lineTax = round2((lineBase - itemDiscount) * (Number(product.gst_percent || 0) / 100));
    const lineTotal = round2(lineBase - itemDiscount + lineTax);

    subtotal += lineBase;
    taxAmount += lineTax;
    discountAmount += itemDiscount;

    normalizedItems.push({
      product_id: productId,
      product_name: product.name,
      batch_id: batchId,
      quantity,
      unit_price: round2(product.selling_price),
      discount_amount: itemDiscount,
      gst_percent: round2(product.gst_percent || 0),
      line_total: lineTotal,
    });
  }

  return {
    items: normalizedItems,
    subtotal: round2(subtotal),
    tax_amount: round2(taxAmount),
    discount_amount: round2(discountAmount),
    total_amount: round2(subtotal - discountAmount + taxAmount),
  };
}

async function deductStockForSale(connection, sale, items, cashierId) {
  for (const item of items) {
    await connection.execute(
      `UPDATE inventory
       SET current_stock = current_stock - ?
       WHERE product_id = ?`,
      [item.quantity, item.product_id]
    );

    if (item.batch_id) {
      await connection.execute(
        `UPDATE product_batches
         SET quantity = quantity - ?
         WHERE id = ?`,
        [item.quantity, item.batch_id]
      );
    }

    await connection.execute(
      `INSERT INTO inventory_movements (
         product_id, movement_type, quantity, balance_after, notes, reference_type, reference_id, batch_id, created_by
       )
       VALUES (
         ?, 'sale', ?, (SELECT current_stock FROM inventory WHERE product_id = ?),
         ?, 'sale', ?, ?, ?
       )`,
      [
        item.product_id,
        -Math.abs(item.quantity),
        item.product_id,
        `Sold through invoice ${sale.invoice_no}`,
        sale.id,
        item.batch_id,
        cashierId,
      ]
    );
  }
}

export async function listSales(filters = {}) {
  const params = [];
  const where = [];

  if (filters.status) {
    where.push("s.bill_status = ?");
    params.push(filters.status);
  }

  if (filters.cashier_id || filters.cashierId) {
    where.push("s.cashier_id = ?");
    params.push(Number(filters.cashier_id ?? filters.cashierId));
  }

  if (filters.date_from || filters.dateFrom) {
    where.push("DATE(s.sale_date) >= ?");
    params.push(filters.date_from ?? filters.dateFrom);
  }

  if (filters.date_to || filters.dateTo) {
    where.push("DATE(s.sale_date) <= ?");
    params.push(filters.date_to ?? filters.dateTo);
  }

  const rows = await query(
    `SELECT s.*,
            c.customer_name,
            c.phone AS customer_phone,
            u.full_name AS cashier_name,
            COALESCE(pay.payment_methods, '') AS payment_methods,
            COALESCE(lines.line_count, 0) AS line_count
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     JOIN users u ON u.id = s.cashier_id
     LEFT JOIN LATERAL (
       SELECT STRING_AGG(DISTINCT sp.payment_method, ', ' ORDER BY sp.payment_method) AS payment_methods
       FROM sale_payments sp
       WHERE sp.sale_id = s.id
     ) pay ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS line_count
       FROM sale_items si
       WHERE si.sale_id = s.id
     ) lines ON TRUE
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY s.sale_date DESC, s.id DESC`,
    params
  );

  return rows;
}

export async function getSaleById(saleId) {
  const connection = await pool.getConnection();
  try {
    return await getSaleHeader(connection, saleId);
  } finally {
    connection.release();
  }
}

export async function listHeldBills() {
  return query(
    `SELECT hb.*,
            c.customer_name,
            u.full_name AS cashier_name,
            COUNT(hbi.id) AS item_count
     FROM held_bills hb
     LEFT JOIN customers c ON c.id = hb.customer_id
     JOIN users u ON u.id = hb.cashier_id
     LEFT JOIN held_bill_items hbi ON hbi.held_bill_id = hb.id
     GROUP BY hb.id, c.customer_name, u.full_name
     ORDER BY hb.updated_at DESC`
  );
}

export async function getHeldBillById(id) {
  const headers = await query(
    `SELECT hb.*, c.customer_name
     FROM held_bills hb
     LEFT JOIN customers c ON c.id = hb.customer_id
     WHERE hb.id = ?
     LIMIT 1`,
    [id]
  );

  if (!headers.length) {
    throw new AppError("Held bill not found", 404);
  }

  const items = await query(
    `SELECT hbi.*, p.name AS product_name, p.sku, p.barcode
     FROM held_bill_items hbi
     JOIN products p ON p.id = hbi.product_id
     WHERE hbi.held_bill_id = ?
     ORDER BY hbi.id ASC`,
    [id]
  );

  return {
    ...headers[0],
    items,
  };
}

export async function holdBill(payload, cashier, ipAddress) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await ensureCustomer(connection, payload.customer_id ?? payload.customerId ?? null);
    const totals = await calculateCart(connection, payload.items || []);
    const billCode = generateInvoice("HOLD");

    const [headerResult] = await connection.execute(
      `INSERT INTO held_bills (hold_code, customer_id, cashier_id, subtotal, discount_amount, tax_amount, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billCode,
        payload.customer_id ?? payload.customerId ?? null,
        cashier.id,
        totals.subtotal,
        totals.discount_amount,
        totals.tax_amount,
        totals.total_amount,
        payload.notes ?? null,
      ]
    );

    for (const item of totals.items) {
      await connection.execute(
        `INSERT INTO held_bill_items (held_bill_id, product_id, batch_id, quantity, unit_price, discount_amount, gst_percent, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          headerResult.insertId,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.discount_amount,
          item.gst_percent,
          item.line_total,
        ]
      );
    }

    await logAudit({
      connection,
      userId: cashier.id,
      action: "HOLD",
      module: "SALE",
      recordId: headerResult.insertId,
      description: `Held bill ${billCode}`,
      ipAddress,
    });

    await connection.commit();
    return getHeldBillById(headerResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createSale(payload, cashier, ipAddress) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const customerId = payload.customer_id ?? payload.customerId ?? null;
    const heldBillId = payload.held_bill_id ?? payload.heldBillId ?? null;
    const customer = await ensureCustomer(connection, customerId);
    const totals = await calculateCart(connection, payload.items || []);
    const payments = normalizePayments(payload.payments || []);

    if (!payments.length) {
      throw new AppError("At least one payment entry is required", 400);
    }

    const paidAmount = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
    if (paidAmount <= 0) {
      throw new AppError("Paid amount must be greater than zero", 400);
    }

    const paymentStatus =
      paidAmount >= totals.total_amount ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

    const invoiceNo = generateInvoice("INV");
    const [saleResult] = await connection.execute(
      `INSERT INTO sales (
         invoice_no, customer_id, cashier_id, subtotal, discount_amount, tax_amount,
         total_amount, payment_status, bill_status, notes
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [
        invoiceNo,
        customerId,
        cashier.id,
        totals.subtotal,
        totals.discount_amount,
        totals.tax_amount,
        totals.total_amount,
        paymentStatus,
        payload.notes ?? null,
      ]
    );

    const saleId = saleResult.insertId;

    for (const item of totals.items) {
      await connection.execute(
        `INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, discount_amount, gst_percent, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.discount_amount,
          item.gst_percent,
          item.line_total,
        ]
      );
    }

    for (const payment of payments) {
      await connection.execute(
        `INSERT INTO sale_payments (sale_id, payment_method, amount, reference_no)
         VALUES (?, ?, ?, ?)`,
        [saleId, payment.payment_method, payment.amount, payment.reference_no]
      );
    }

    const sale = {
      id: saleId,
      invoice_no: invoiceNo,
    };

    await deductStockForSale(connection, sale, totals.items, cashier.id);

    if (customer) {
      const earnedPoints = Math.floor(totals.total_amount / 100);
      if (earnedPoints > 0) {
        await connection.execute(
          `UPDATE customers
           SET loyalty_points = loyalty_points + ?
           WHERE id = ?`,
          [earnedPoints, customer.id]
        );

        await connection.execute(
          `INSERT INTO loyalty_transactions (customer_id, sale_id, transaction_type, points, notes)
           VALUES (?, ?, 'earned', ?, ?)`,
          [customer.id, saleId, earnedPoints, `Earned from invoice ${invoiceNo}`]
        );
      }
    }

    if (heldBillId) {
      await connection.execute("DELETE FROM held_bill_items WHERE held_bill_id = ?", [heldBillId]);
      await connection.execute("DELETE FROM held_bills WHERE id = ?", [heldBillId]);
    }

    await logAudit({
      connection,
      userId: cashier.id,
      action: "CREATE",
      module: "SALE",
      recordId: saleId,
      description: `Completed sale ${invoiceNo}`,
      ipAddress,
    });

    await connection.commit();
    return getSaleHeader(connection, saleId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createSaleReturn(saleId, payload, user, ipAddress) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const sale = await getSaleHeader(connection, saleId);
    if (sale.bill_status === "returned") {
      throw new AppError("Sale is already fully returned", 400);
    }

    const returnItems = payload.items || [];
    if (!returnItems.length) {
      throw new AppError("At least one return item is required", 400);
    }

    let totalRefund = 0;
    const preparedItems = [];

    for (const requestItem of returnItems) {
      const saleItemId = Number(requestItem.sale_item_id ?? requestItem.saleItemId);
      const quantity = Number(requestItem.quantity ?? 0);

      if (!saleItemId || quantity <= 0) {
        throw new AppError("Each return item must include a sale item and quantity", 400);
      }

      const saleItem = sale.items.find((item) => item.id === saleItemId);
      if (!saleItem) {
        throw new AppError(`Sale item ${saleItemId} was not found on this sale`, 400);
      }

      const [returnedRows] = await connection.execute(
        `SELECT COALESCE(SUM(ri.quantity), 0) AS returned_qty
         FROM return_items ri
         JOIN sale_returns sr ON sr.id = ri.sale_return_id
         WHERE sr.sale_id = ? AND ri.sale_item_id = ?`,
        [saleId, saleItemId]
      );

      const returnedQty = Number(returnedRows[0]?.returned_qty || 0);
      const availableQty = Number(saleItem.quantity) - returnedQty;

      if (quantity > availableQty) {
        throw new AppError(`Return quantity exceeds available quantity for ${saleItem.product_name}`, 400);
      }

      const refundAmount = round2((Number(saleItem.line_total) / Number(saleItem.quantity)) * quantity);
      totalRefund += refundAmount;

      preparedItems.push({
        sale_item_id: saleItemId,
        product_id: saleItem.product_id,
        batch_id: saleItem.batch_id,
        quantity,
        refund_amount: refundAmount,
        reason: String(requestItem.reason ?? "").trim() || null,
      });
    }

    const returnNumber = generateInvoice("RET");
    const [returnResult] = await connection.execute(
      `INSERT INTO sale_returns (sale_id, return_no, refund_amount, notes, processed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [saleId, returnNumber, round2(totalRefund), payload.notes ?? null, user.id]
    );

    for (const item of preparedItems) {
      await connection.execute(
        `INSERT INTO return_items (sale_return_id, sale_item_id, product_id, quantity, refund_amount, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          returnResult.insertId,
          item.sale_item_id,
          item.product_id,
          item.quantity,
          item.refund_amount,
          item.reason,
        ]
      );

      await connection.execute(
        `UPDATE inventory
         SET current_stock = current_stock + ?
         WHERE product_id = ?`,
        [item.quantity, item.product_id]
      );

      if (item.batch_id) {
        await connection.execute(
          `UPDATE product_batches
           SET quantity = quantity + ?
           WHERE id = ?`,
          [item.quantity, item.batch_id]
        );
      }

      await connection.execute(
        `INSERT INTO inventory_movements (
           product_id, movement_type, quantity, balance_after, notes, reference_type, reference_id, batch_id, created_by
         )
         VALUES (
           ?, 'sale_return', ?, (SELECT current_stock FROM inventory WHERE product_id = ?),
           ?, 'sale_return', ?, ?, ?
         )`,
        [
          item.product_id,
          item.quantity,
          item.product_id,
          `Returned against invoice ${sale.invoice_no}`,
          returnResult.insertId,
          item.batch_id,
          user.id,
        ]
      );
    }

    const [totals] = await connection.execute(
      `SELECT COUNT(*) AS total_lines,
              SUM(COALESCE(ri.quantity, 0)) AS returned_lines
       FROM sale_items si
       LEFT JOIN return_items ri ON ri.sale_item_id = si.id
       WHERE si.sale_id = ?`,
      [saleId]
    );

    const status = Number(totals[0]?.returned_lines || 0) >= Number(totals[0]?.total_lines || 0) ? "returned" : sale.bill_status;
    await connection.execute("UPDATE sales SET bill_status = ? WHERE id = ?", [status, saleId]);

    await logAudit({
      connection,
      userId: user.id,
      action: "RETURN",
      module: "SALE",
      recordId: saleId,
      description: `Processed return ${returnNumber} for sale ${sale.invoice_no}`,
      ipAddress,
    });

    await connection.commit();
    return getSaleHeader(connection, saleId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
