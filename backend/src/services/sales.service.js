import pool from "../config/db.js";
import { AppError } from "../utils/appError.js";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
  return Number(toNumber(value).toFixed(2));
}

async function resolveCustomer(connection, payload = {}) {
  const quickCustomer = payload.customer ?? payload.quick_customer ?? null;
  const customerId = payload.customer_id ?? payload.customerId ?? null;

  if (customerId) {
    const [rows] = await connection.execute("SELECT id FROM customers WHERE id = ? LIMIT 1", [Number(customerId)]);
    if (!rows.length) {
      throw new AppError("Customer not found", 404);
    }
    return Number(customerId);
  }

  if (quickCustomer?.customer_name || quickCustomer?.name) {
    const name = String(quickCustomer.customer_name ?? quickCustomer.name).trim();
    const phone = String(quickCustomer.phone ?? "").trim() || null;
    const email = String(quickCustomer.email ?? "").trim() || null;
    const address = String(quickCustomer.address ?? "").trim() || null;

    if (!name) {
      throw new AppError("Customer name is required for quick add", 400);
    }

    const [result] = await connection.execute(
      "INSERT INTO customers (customer_name, phone, email, address, status) VALUES (?, ?, ?, ?, 'active')",
      [name, phone, email, address],
    );

    return result.insertId;
  }

  const [walkInRows] = await connection.execute(
    "SELECT id FROM customers WHERE LOWER(customer_name) IN ('walk-in', 'walk in', 'walkin') ORDER BY id ASC LIMIT 1",
  );

  return walkInRows[0]?.id ?? null;
}

async function buildInvoiceNumber(connection) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const [rows] = await connection.execute(
    `SELECT invoice_no
     FROM sales
     WHERE invoice_no LIKE ?
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`,
    [`${prefix}%`],
  );

  const lastInvoice = rows[0]?.invoice_no ?? "";
  const lastSequence = Number(lastInvoice.split("-").pop() ?? 0);
  const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

async function validateAndPrepareItems(connection, items = []) {
  if (!Array.isArray(items) || !items.length) {
    throw new AppError("Cart is empty", 400);
  }

  const prepared = [];

  for (const row of items) {
    const productId = Number(row.product_id ?? row.productId);
    const quantity = toNumber(row.quantity);
    const price = round2(row.price ?? row.unit_price ?? row.unitPrice);
    const gstPercent = round2(row.gst_percent ?? row.gstPercent ?? 0);

    if (!productId || quantity <= 0 || price < 0) {
      throw new AppError("Invalid cart item payload", 400);
    }

    const [productRows] = await connection.execute(
      `SELECT p.id, p.name, p.status, COALESCE(i.current_stock, 0) AS current_stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.id = ?
       LIMIT 1
       FOR UPDATE`,
      [productId],
    );

    if (!productRows.length || productRows[0].status !== "active") {
      throw new AppError(`Invalid product selected: ${productId}`, 400);
    }

    const stock = toNumber(productRows[0].current_stock);
    if (stock < quantity) {
      throw new AppError(`Insufficient stock for ${productRows[0].name}`, 400);
    }

    const lineSubtotal = round2(quantity * price);
    const lineTax = round2(lineSubtotal * (gstPercent / 100));
    const lineTotal = round2(lineSubtotal + lineTax);

    prepared.push({
      product_id: productId,
      product_name: productRows[0].name,
      quantity,
      price,
      gst_percent: gstPercent,
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: lineTotal,
    });
  }

  return prepared;
}

function calculateTotals(items, payload = {}) {
  const computedSubtotal = round2(items.reduce((sum, row) => sum + row.line_subtotal, 0));
  const computedTax = round2(items.reduce((sum, row) => sum + row.line_tax, 0));

  const subtotal = round2(payload.subtotal ?? computedSubtotal);
  const discount = round2(payload.discount ?? payload.discount_amount ?? 0);
  const tax = round2(payload.tax ?? payload.tax_amount ?? computedTax);
  const total = round2(payload.total ?? subtotal - discount + tax);

  return {
    subtotal,
    discount,
    tax,
    total,
  };
}

function normalizePayment(payload = {}, totals = { total: 0 }) {
  const paymentMethod = String(payload.payment_method ?? payload.paymentMethod ?? "cash").trim().toLowerCase() || "cash";
  const amount = round2(payload.paid_amount ?? payload.amount ?? totals.total);

  return {
    payment_method: paymentMethod,
    amount,
    reference_no: String(payload.reference_no ?? payload.referenceNo ?? "").trim() || null,
  };
}

export async function createSale(payload, user, ipAddress) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const items = await validateAndPrepareItems(connection, payload.items || []);
    const totals = calculateTotals(items, payload);
    const payment = normalizePayment(payload, totals);

    if (totals.total <= 0) {
      throw new AppError("Invalid total amount", 400);
    }

    const cashierId = Number(payload.cashier_id ?? payload.cashierId ?? user?.id);
    if (!cashierId) {
      throw new AppError("Cashier is required", 400);
    }

    const customerId = await resolveCustomer(connection, payload);
    const invoiceNo = await buildInvoiceNumber(connection);

    const [saleResult] = await connection.execute(
      `INSERT INTO sales (
         invoice_no,
         customer_id,
         cashier_id,
         subtotal,
         discount_amount,
         tax_amount,
         total_amount,
         payment_status,
         bill_status,
         notes
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', 'completed', ?)`,
      [invoiceNo, customerId, cashierId, totals.subtotal, totals.discount, totals.tax, totals.total, payload.notes ?? null],
    );

    const saleId = saleResult.insertId;

    for (const item of items) {
      await connection.execute(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_amount, gst_percent, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saleId, item.product_id, item.quantity, item.price, 0, item.gst_percent, item.line_total],
      );

      const [stockUpdate] = await connection.execute(
        `UPDATE inventory
         SET current_stock = current_stock - ?
         WHERE product_id = ? AND current_stock >= ?`,
        [item.quantity, item.product_id, item.quantity],
      );

      if (!stockUpdate.affectedRows) {
        throw new AppError(`Insufficient stock for ${item.product_name}`, 400);
      }

      await connection.execute(
        `INSERT INTO inventory_movements (
           product_id,
           movement_type,
           quantity,
           balance_after,
           notes,
           reference_type,
           reference_id,
           created_by
         )
         VALUES (
           ?,
           'sale',
           ?,
           (SELECT current_stock FROM inventory WHERE product_id = ?),
           ?,
           'sale',
           ?,
           ?
         )`,
        [item.product_id, -Math.abs(item.quantity), item.product_id, `Sold via ${invoiceNo}`, saleId, cashierId],
      );
    }

    if (payment.amount > 0) {
      await connection.execute(
        `INSERT INTO sale_payments (sale_id, payment_method, amount, reference_no)
         VALUES (?, ?, ?, ?)`,
        [saleId, payment.payment_method, payment.amount, payment.reference_no],
      );
    }

    await connection.commit();

    return {
      success: true,
      sale_id: saleId,
      invoice_no: invoiceNo,
      cashier_id: cashierId,
      customer_id: customerId,
      ip_address: ipAddress ?? null,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getInvoiceBySaleId(saleId) {
  const connection = await pool.getConnection();

  try {
    const [saleRows] = await connection.execute(
      `SELECT s.id,
              s.invoice_no,
              s.sale_date,
              s.subtotal,
              s.discount_amount,
              s.tax_amount,
              s.total_amount,
              s.payment_status,
              s.bill_status,
              s.notes,
              c.id AS customer_id,
              c.customer_name,
              c.phone AS customer_phone,
              c.email AS customer_email,
              c.address AS customer_address,
              u.id AS cashier_id,
              u.full_name AS cashier_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.cashier_id
       WHERE s.id = ?
       LIMIT 1`,
      [saleId],
    );

    if (!saleRows.length) {
      throw new AppError("Sale not found", 404);
    }

    const [itemRows] = await connection.execute(
      `SELECT si.id,
              si.product_id,
              p.name AS product_name,
              p.sku,
              p.barcode,
              si.quantity,
              si.unit_price,
              si.discount_amount,
              si.gst_percent,
              si.line_total
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?
       ORDER BY si.id ASC`,
      [saleId],
    );

    const [paymentRows] = await connection.execute(
      `SELECT payment_method, amount, reference_no
       FROM sale_payments
       WHERE sale_id = ?
       ORDER BY id ASC`,
      [saleId],
    );

    return {
      sale: saleRows[0],
      customer: {
        id: saleRows[0].customer_id,
        customer_name: saleRows[0].customer_name ?? "Walk-in",
        phone: saleRows[0].customer_phone,
        email: saleRows[0].customer_email,
        address: saleRows[0].customer_address,
      },
      cashier: {
        id: saleRows[0].cashier_id,
        full_name: saleRows[0].cashier_name,
      },
      items: itemRows,
      payments: paymentRows,
      totals: {
        subtotal: round2(saleRows[0].subtotal),
        discount: round2(saleRows[0].discount_amount),
        tax: round2(saleRows[0].tax_amount),
        total: round2(saleRows[0].total_amount),
      },
    };
  } finally {
    connection.release();
  }
}

export async function getSalesSummary(filters = {}) {
  const params = [];
  const where = [];

  if (filters.date_from || filters.dateFrom) {
    where.push("DATE(s.sale_date) >= ?");
    params.push(filters.date_from ?? filters.dateFrom);
  }

  if (filters.date_to || filters.dateTo) {
    where.push("DATE(s.sale_date) <= ?");
    params.push(filters.date_to ?? filters.dateTo);
  }

  const [rows] = await pool.execute(
    `SELECT
       COUNT(DISTINCT s.id) AS total_sales,
       COALESCE(SUM(s.total_amount), 0) AS total_revenue,
       COALESCE(SUM(si.quantity), 0) AS total_items_sold
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`,
    params,
  );

  return rows[0];
}

export async function getSalesList(filters = {}) {
  const params = [];
  const where = [];

  if (filters.date_from || filters.dateFrom) {
    where.push("DATE(s.sale_date) >= ?");
    params.push(filters.date_from ?? filters.dateFrom);
  }

  if (filters.date_to || filters.dateTo) {
    where.push("DATE(s.sale_date) <= ?");
    params.push(filters.date_to ?? filters.dateTo);
  }

  const [rows] = await pool.execute(
    `SELECT
       s.id,
       s.invoice_no,
       COALESCE(c.customer_name, 'Walk-in') AS customer,
       s.total_amount AS total,
       s.sale_date AS date
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY s.sale_date DESC, s.id DESC`,
    params,
  );

  return rows;
}
