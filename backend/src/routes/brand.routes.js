import { Router } from "express";
import {
  getBrand,
  getBrands,
  postBrand,
  putBrand,
  removeBrand,
} from "../controllers/brand.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/", authenticate, requirePermission("brands.view"), getBrands);
router.get("/:id", authenticate, requirePermission("brands.view"), getBrand);
router.post("/", authenticate, requirePermission("brands.add"), postBrand);
router.put("/:id", authenticate, requirePermission("brands.edit"), putBrand);
router.delete("/:id", authenticate, requirePermission("brands.delete"), removeBrand);

export default router;
