import app from "./app.js";
import env from "./config/env.js";
import pool from "./config/db.js";

const startServer = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL connected successfully");
    connection.release();

    const PORT = env.PORT || process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ MySQL connection failed:");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();