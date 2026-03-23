import { Router } from "express";
import {
  getSupplier,
  getSuppliers,
  postSupplier,
  putSupplier,
  removeSupplier,
} from "../controllers/supplier.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("suppliers.view"), getSuppliers);
router.get("/:id", authenticate, requirePermission("suppliers.view"), getSupplier);
router.post("/", authenticate, requirePermission("suppliers.add"), postSupplier);
router.put("/:id", authenticate, requirePermission("suppliers.edit"), putSupplier);
router.delete("/:id", authenticate, requirePermission("suppliers.delete"), removeSupplier);

export default router;
