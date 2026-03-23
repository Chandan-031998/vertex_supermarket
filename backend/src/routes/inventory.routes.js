import { Router } from "express";
import {
  getExpiryAlerts,
  getInventory,
  getInventoryMovementHistory,
  getInventorySummary,
  getLowStock,
  postInventoryAdjustment,
} from "../controllers/inventory.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("inventory.view"), getInventory);
router.get("/summary", authenticate, requirePermission("inventory.view"), getInventorySummary);
router.get("/low-stock", authenticate, requirePermission("inventory.low_stock"), getLowStock);
router.get("/expiry-alerts", authenticate, requirePermission("inventory.expiry"), getExpiryAlerts);
router.get("/movements", authenticate, requirePermission("inventory.view"), getInventoryMovementHistory);
router.post("/adjustments", authenticate, requirePermission("inventory.adjust"), postInventoryAdjustment);

export default router;
