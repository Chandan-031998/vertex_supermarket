import dotenv from "dotenv";

dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_POOLER_URL: process.env.SUPABASE_POOLER_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,

  DB_HOST: process.env.DB_HOST,
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "access_secret_key",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "refresh_secret_key",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
};

export default env;
