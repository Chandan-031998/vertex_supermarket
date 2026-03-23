import { Router } from "express";
import {
  getPurchase,
  getPurchases,
  postGoodsReceipt,
  postPurchase,
  postPurchaseStatus,
  postSupplierPayment,
} from "../controllers/purchase.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("purchases.view"), getPurchases);
router.get("/:id", authenticate, requirePermission("purchases.view"), getPurchase);
router.post("/", authenticate, requirePermission("purchases.add"), postPurchase);
router.post("/:id/status", authenticate, requirePermission("purchases.approve"), postPurchaseStatus);
router.post("/:id/receive", authenticate, requirePermission("grn.receive"), postGoodsReceipt);
router.post("/:id/payments", authenticate, requirePermission("purchases.edit", "expenses.add"), postSupplierPayment);

export default router;
