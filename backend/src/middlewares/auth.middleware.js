import { query } from "../config/db.js";
import { getUserPermissionKeys } from "../services/permission.service.js";
import { verifyAccessToken } from "../utils/token.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = header.split(" ")[1];
    const decoded = verifyAccessToken(token);
    const rows = await query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.status, r.name AS role, u.role_id
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? LIMIT 1`,
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const user = rows[0];
    user.permissions = await getUserPermissionKeys(user.id, user.role);
    user.profile_image = null;
    user.notification_preferences = {};

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}
