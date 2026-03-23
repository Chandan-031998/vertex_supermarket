import { Router } from "express";
import {
  getStaffData,
  postPasswordReset,
  postRole,
  postShift,
  postUser,
} from "../controllers/staff.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/bootstrap", authenticate, requirePermission("users.view", "roles.view", "audit.view"), getStaffData);
router.post("/roles", authenticate, requirePermission("roles.add"), postRole);
router.post("/users", authenticate, requirePermission("users.add"), postUser);
router.post("/users/:id/password", authenticate, requirePermission("users.edit"), postPasswordReset);
router.post("/shifts", authenticate, postShift);

export default router;
