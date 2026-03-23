import { Router } from "express";
import authRoutes from "./auth.routes.js";
import brandRoutes from "./brand.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import categoryRoutes from "./category.routes.js";
import productRoutes from "./product.routes.js";
import customerRoutes from "./customer.routes.js";
import supplierRoutes from "./supplier.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import purchaseRoutes from "./purchase.routes.js";
import saleRoutes from "./sale.routes.js";
import reportRoutes from "./report.routes.js";
import accountingRoutes from "./accounting.routes.js";
import staffRoutes from "./staff.routes.js";
import rolesRoutes from "./roles.routes.js";
import permissionsRoutes from "./permissions.routes.js";
import settingsRoutes from "./settings.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, message: "Vertex Supermarket Backend Running" });
});

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/brands", brandRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/customers", customerRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/reports", reportRoutes);
router.use("/accounting", accountingRoutes);
router.use("/staff", staffRoutes);
router.use("/roles", rolesRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/settings", settingsRoutes);

export default router;
