import { Router } from "express";
import {
  getHeldSale,
  getHeldSales,
  getSale,
  getSales,
  postHeldSale,
  postSale,
  postSaleReturn,
} from "../controllers/sale.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("pos.view"), getSales);
router.get("/held", authenticate, requirePermission("pos.resume"), getHeldSales);
router.get("/held/:id", authenticate, requirePermission("pos.resume"), getHeldSale);
router.get("/:id", authenticate, requirePermission("pos.view"), getSale);
router.post("/", authenticate, requirePermission("pos.add"), postSale);
router.post("/hold", authenticate, requirePermission("pos.hold"), postHeldSale);
router.post("/:id/return", authenticate, requirePermission("pos.refund"), postSaleReturn);

export default router;
