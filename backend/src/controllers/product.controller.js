import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  searchSaleProducts,
  updateProduct,
} from "../services/product.service.js";
import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";

export async function getProducts(req, res, next) {
  try {
    const data = await listProducts(req.query);
    res.json({ success: true, message: "Products fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const data = await getProductById(Number(req.params.id));
    res.json({ success: true, message: "Product fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getProductByBarcode(req, res, next) {
  try {
    const barcode = String(req.params.barcode ?? "").trim();
    if (!barcode) {
      throw new AppError("Barcode is required", 400);
    }

    const rows = await query(
      `SELECT p.id, p.name, p.sku, p.barcode, p.unit, p.selling_price, p.mrp, p.gst_percent, p.track_batch, p.track_expiry,
              COALESCE(i.current_stock, 0) AS current_stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       WHERE p.status = 'active' AND p.barcode = ?
       LIMIT 1`,
      [barcode]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Product not found for scanned barcode",
      });
    }

    return res.json({
      success: true,
      message: "Product fetched successfully",
      data: rows[0],
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSaleSearchProducts(req, res, next) {
  try {
    const data = await searchSaleProducts(req.query.q || "");
    res.json({ success: true, message: "POS products fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postProduct(req, res, next) {
  try {
    const data = await createProduct(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Product created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function putProduct(req, res, next) {
  try {
    const data = await updateProduct(Number(req.params.id), req.body, req.user, req.ip);
    res.json({ success: true, message: "Product updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function removeProduct(req, res, next) {
  try {
    const data = await deleteProduct(Number(req.params.id), req.user, req.ip);
    res.json({ success: true, message: "Product deleted successfully", data });
  } catch (error) {
    next(error);
  }
}
