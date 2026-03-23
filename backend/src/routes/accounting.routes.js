import { Router } from "express";
import { getAccountingOverview, getExpenses, postExpense } from "../controllers/accounting.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/summary", authenticate, requirePermission("expenses.view", "reports.pnl"), getAccountingOverview);
router.get("/expenses", authenticate, requirePermission("expenses.view"), getExpenses);
router.post("/expenses", authenticate, requirePermission("expenses.add"), postExpense);

export default router;
