import { Router } from "express";
import {
  getProduct,
  getProductByBarcode,
  getProducts,
  getSaleSearchProducts,
  postProduct,
  putProduct,
  removeProduct,
} from "../controllers/product.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const router = Router();

router.get("/search/pos", authenticate, requirePermission("pos.view"), getSaleSearchProducts);
router.get("/barcode/:barcode", authenticate, requirePermission("pos.view"), getProductByBarcode);
router.get("/", authenticate, requirePermission("products.view"), getProducts);
router.get("/:id", authenticate, requirePermission("products.view"), getProduct);
router.post("/", authenticate, requirePermission("products.add"), postProduct);
router.put("/:id", authenticate, requirePermission("products.edit"), putProduct);
router.delete("/:id", authenticate, requirePermission("products.delete"), removeProduct);

export default router;
