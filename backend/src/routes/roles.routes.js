import { Router } from "express";
import {
  getRole,
  getRolePermissions,
  getRoles,
  postAssignUserRole,
  postRole,
  putRole,
  putRolePermissions,
  removeRole,
} from "../controllers/roles.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("roles.view"), getRoles);
router.get("/:id", authenticate, requirePermission("roles.view"), getRole);
router.post("/", authenticate, requirePermission("roles.add"), postRole);
router.put("/:id", authenticate, requirePermission("roles.edit"), putRole);
router.delete("/:id", authenticate, requirePermission("roles.delete"), removeRole);
router.get("/:id/permissions", authenticate, requirePermission("roles.permissions"), getRolePermissions);
router.put("/:id/permissions", authenticate, requirePermission("roles.permissions"), putRolePermissions);
router.post("/:id/assign-user", authenticate, requirePermission("roles.edit"), postAssignUserRole);

export default router;
