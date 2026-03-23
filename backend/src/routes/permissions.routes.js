import { Router } from "express";
import { getMyPermissions, getPermissionsCatalog } from "../controllers/permissions.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/catalog", authenticate, requirePermission("roles.permissions", "roles.view"), getPermissionsCatalog);
router.get("/me", authenticate, getMyPermissions);

export default router;
