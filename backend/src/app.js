import express from "express";
import cors from "cors";
import env from "./config/env.js";
import { query } from "./config/db.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://vertex-supermarke.vercel.app",
  env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
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

export default app;