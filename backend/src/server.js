import app from "./app.js";
import env from "./config/env.js";
import { testDatabaseConnection } from "./config/db.js";

const startServer = async () => {
  try {
    const dbStatus = await testDatabaseConnection();
    console.log(
      `✅ PostgreSQL connected successfully (${dbStatus.mode}) at ${dbStatus.dbTime ?? "unknown-time"}`
    );

    const PORT = Number(process.env.PORT || env.PORT || 5000);
    const HOST = "0.0.0.0";

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("❌ PostgreSQL connection failed");
    console.error("message:", error?.message || "Unknown error");
    if (error?.code) {
      console.error("code:", error.code);
    }
    console.error(
      "hint: if direct host times out, set SUPABASE_POOLER_URL to Supabase pooler (port 6543)."
    );
    process.exit(1);
  }
};

startServer();
