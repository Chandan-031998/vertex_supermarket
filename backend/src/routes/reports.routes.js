import { Router } from "express";
import {
  getReportPackData,
  getSalesList,
  getSalesSummary,
} from "../controllers/reports.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/sales-summary", authenticate, requirePermission("reports.sales"), getSalesSummary);
router.get("/sales-list", authenticate, requirePermission("reports.sales"), getSalesList);
router.get("/pack", authenticate, requirePermission("reports.sales", "reports.gst", "reports.pnl", "reports.purchases"), getReportPackData);

export default router;
