import {
  addSupplierPayment,
  createPurchase,
  getPurchaseById,
  listPurchases,
  receivePurchase,
  updatePurchaseStatus,
} from "../services/purchase.service.js";

export async function getPurchases(req, res, next) {
  try {
    const data = await listPurchases(req.query);
    res.json({ success: true, message: "Purchases fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function getPurchase(req, res, next) {
  try {
    const data = await getPurchaseById(Number(req.params.id));
    res.json({ success: true, message: "Purchase fetched successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postPurchase(req, res, next) {
  try {
    const data = await createPurchase(req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Purchase order created successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postPurchaseStatus(req, res, next) {
  try {
    const data = await updatePurchaseStatus(Number(req.params.id), req.body.status, req.user, req.ip);
    res.json({ success: true, message: "Purchase status updated successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postGoodsReceipt(req, res, next) {
  try {
    const data = await receivePurchase(Number(req.params.id), req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Goods receipt recorded successfully", data });
  } catch (error) {
    next(error);
  }
}

export async function postSupplierPayment(req, res, next) {
  try {
    const data = await addSupplierPayment(Number(req.params.id), req.body, req.user, req.ip);
    res.status(201).json({ success: true, message: "Supplier payment recorded successfully", data });
  } catch (error) {
    next(error);
  }
}
