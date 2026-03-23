import { Router } from "express";
import { reportPack, salesSummary } from "../controllers/report.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/sales-summary", authenticate, requirePermission("reports.sales"), salesSummary);
router.get("/pack", authenticate, requirePermission("reports.sales", "reports.gst", "reports.pnl", "reports.purchases"), reportPack);

export default router;
