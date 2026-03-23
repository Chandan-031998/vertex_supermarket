import express from "express";
import cors from "cors";
import env from "./config/env.js";
import { query } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://vertex-supermarke.vercel.app",
  "https://vertex-supermarket.vercel.app",
  env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

export default app;