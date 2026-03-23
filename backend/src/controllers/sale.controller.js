import {
  createSale,
  createSaleReturn,
  getHeldBillById,
  getSaleById,
  holdBill,
  listHeldBills,
  listSales,
} from "../services/sale.service.js";

export async function getSales(req, res, next) {
  try {
    const data = await listSales(req.query);
    res.json({ success: true, message: "Sales fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getSale(req, res, next) {
  try {
    const data = await getSaleById(Number(req.params.id));
    res.json({ success: true, message: "Sale fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getHeldSales(req, res, next) {
  try {
    const data = await listHeldBills();
    res.json({ success: true, message: "Held bills fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getHeldSale(req, res, next) {
  try {
    const data = await getHeldBillById(Number(req.params.id));
    res.json({ success: true, message: "Held bill fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postSale(req, res, next) {
  try {
    const data = await createSale(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Sale completed successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postHeldSale(req, res, next) {
  try {
    const data = await holdBill(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Bill held successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postSaleReturn(req, res, next) {
  try {
    const data = await createSaleReturn(Number(req.params.id), req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Sale return processed successfully", data });
  } catch (error) {
    next(error);
  }
}
