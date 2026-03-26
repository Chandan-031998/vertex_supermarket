import { searchSaleProducts } from "../services/product.service.js";
import {
  createSaleReturn,
  createSale,
  getHeldBillById,
  getSaleById,
  holdBill,
  listHeldBills,
  listSales,
} from "../services/sale.service.js";

export async function getPosProducts(req, res, next) {
  try {
    const query = String(req.query.q ?? req.query.search ?? "");
    const data = await searchSaleProducts(query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSales(req, res, next) {
  try {
    const data = await listSales(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSale(req, res, next) {
  try {
    const data = await getSaleById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const data = await getSaleById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postSale(req, res, next) {
  try {
    const data = await createSale(req.body, req.user, req.ip);
    res.status(201).json({
      success: true,
      sale_id: data.id,
      invoice_no: data.invoice_no,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getHeldSales(req, res, next) {
  try {
    const data = await listHeldBills();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getHeldSale(req, res, next) {
  try {
    const data = await getHeldBillById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postHoldSale(req, res, next) {
  try {
    const data = await holdBill(req.body, req.user, req.ip);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postSaleReturn(req, res, next) {
  try {
    const data = await createSaleReturn(Number(req.params.id), req.body, req.user, req.ip);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
