import { Router } from "express";
import {
  getHeldBills,
  postHeldBill,
  resumeHeldBill,
} from "../controllers/heldBills.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("pos.resume"), getHeldBills);
router.post("/", authenticate, requirePermission("pos.hold"), postHeldBill);
router.post("/:id/resume", authenticate, requirePermission("pos.resume"), resumeHeldBill);

export default router;
