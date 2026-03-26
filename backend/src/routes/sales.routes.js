import { Router } from "express";
import {
  getHeldSale,
  getHeldSales,
  getInvoice,
  getPosProducts,
  getSale,
  getSales,
  postHoldSale,
  postSaleReturn,
  postSale,
} from "../controllers/sales.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/permission.middleware.js";

const salesRouter = Router();
const posRouter = Router();

posRouter.get("/products", authenticate, requirePermission("pos.view"), getPosProducts);

salesRouter.get("/", authenticate, requirePermission("pos.view"), getSales);
salesRouter.get("/held", authenticate, requirePermission("pos.resume"), getHeldSales);
salesRouter.get("/held/:id", authenticate, requirePermission("pos.resume"), getHeldSale);
salesRouter.post("/hold", authenticate, requirePermission("pos.hold"), postHoldSale);
salesRouter.get("/:id", authenticate, requirePermission("pos.view"), getSale);
salesRouter.get("/:id/invoice", authenticate, requirePermission("pos.view", "pos.print"), getInvoice);
salesRouter.post("/:id/return", authenticate, requirePermission("pos.refund"), postSaleReturn);
salesRouter.post("/", authenticate, requirePermission("pos.add"), postSale);

export { posRouter };
export default salesRouter;
