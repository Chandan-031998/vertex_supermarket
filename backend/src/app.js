import express from "express";
import cors from "cors";
import env from "./config/env.js";
import { query } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import suppliersRoutes from "./routes/suppliers.routes.js";
import salesRoutes, { posRouter } from "./routes/sales.routes.js";
import heldBillsRoutes from "./routes/heldBills.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import accountingRoutes from "./routes/accounting.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import permissionsRoutes from "./routes/permissions.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

const defaultOrigins = [
  "http://localhost:5173",
  "https://vertex-supermarket.vercel.app",
  "https://supermarket.vertexsoftware.in",
  "http://supermarket.vertexsoftware.in",
];

const envOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins, env.CLIENT_URL].filter(Boolean))];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Vertex Supermarket Backend Running",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    await query("SELECT 1 AS db_ok");
    res.status(200).json({
      success: true,
      message: "Database connected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);

app.use("/api/customers", customersRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/pos", posRouter);
app.use("/api/sales", salesRoutes);
app.use("/api/held-bills", heldBillsRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/permissions", permissionsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

export default app;
