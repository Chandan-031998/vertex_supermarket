import {
  getHeldBillById,
  holdBill,
  listHeldBills,
} from "../services/sale.service.js";

export async function getHeldBills(req, res, next) {
  try {
    const data = await listHeldBills();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function postHeldBill(req, res, next) {
  try {
    const data = await holdBill(req.body, req.user, req.ip);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function resumeHeldBill(req, res, next) {
  try {
    const data = await getHeldBillById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
