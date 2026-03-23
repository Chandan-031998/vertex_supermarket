import { Router } from "express";
import {
  getCustomer,
  getCustomers,
  postCustomer,
  putCustomer,
  removeCustomer,
} from "../controllers/customer.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("customers.view"), getCustomers);
router.get("/:id", authenticate, requirePermission("customers.view"), getCustomer);
router.post("/", authenticate, requirePermission("customers.add"), postCustomer);
router.put("/:id", authenticate, requirePermission("customers.edit"), putCustomer);
router.delete("/:id", authenticate, requirePermission("customers.delete"), removeCustomer);

export default router;
