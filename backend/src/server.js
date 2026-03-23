import app from "./app.js";
import env from "./config/env.js";
import pool from "./config/db.js";

const startServer = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL connected successfully");
    connection.release();

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ MySQL connection failed:");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();