import { Router } from "express";
import {
  deleteSupplier,
  getSuppliers,
  postSupplier,
  putSupplier,
} from "../controllers/suppliers.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("suppliers.view"), getSuppliers);
router.post("/", authenticate, requirePermission("suppliers.add"), postSupplier);
router.put("/:id", authenticate, requirePermission("suppliers.edit"), putSupplier);
router.delete("/:id", authenticate, requirePermission("suppliers.delete"), deleteSupplier);

export default router;
