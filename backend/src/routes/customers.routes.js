import { Router } from "express";
import {
  deleteCustomer,
  getCustomers,
  postCustomer,
  putCustomer,
} from "../controllers/customers.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("customers.view"), getCustomers);
router.post("/", authenticate, requirePermission("customers.add"), postCustomer);
router.put("/:id", authenticate, requirePermission("customers.edit"), putCustomer);
router.delete("/:id", authenticate, requirePermission("customers.delete"), deleteCustomer);

export default router;
