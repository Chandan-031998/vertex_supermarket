import { Router } from "express";
import {
  getCategories,
  getCategory,
  postCategory,
  putCategory,
  removeCategory,
} from "../controllers/category.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("categories.view"), getCategories);
router.get("/:id", authenticate, requirePermission("categories.view"), getCategory);
router.post("/", authenticate, requirePermission("categories.add"), postCategory);
router.put("/:id", authenticate, requirePermission("categories.edit"), putCategory);
router.delete("/:id", authenticate, requirePermission("categories.delete"), removeCategory);

export default router;
