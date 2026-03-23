import { Router } from "express";
import { dashboardSummary } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();
router.get("/summary", authenticate, requirePermission("dashboard.view"), dashboardSummary);
export default router;
