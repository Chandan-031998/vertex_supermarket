import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

export async function loginUser({ email, password }) {
  const rows = await query(
    `SELECT u.id, u.full_name, u.email, u.password_hash, u.status, r.name AS role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?
     LIMIT 1`,
    [String(email ?? "").trim().toLowerCase()]
  );

  if (!rows.length) {
    throw new AppError("Invalid credentials", 401);
  }

  const user = rows[0];
  if (user.status !== "active") {
    throw new AppError("User account is inactive", 403);
  }

  const matched = await bcrypt.compare(password, user.password_hash);
  if (!matched) {
    throw new AppError("Invalid credentials", 401);
  }

  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    },
  };
}
