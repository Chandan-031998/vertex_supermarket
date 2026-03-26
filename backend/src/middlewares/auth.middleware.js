import { query } from "../config/db.js";
import { getUserPermissionKeys } from "../services/permission.service.js";
import { verifyAccessToken } from "../utils/token.js";

const authUserCache = new Map();
const AUTH_USER_TTL_MS = 2 * 60 * 1000;

function getCacheKey(decoded) {
  return `${decoded?.id ?? "0"}:${String(decoded?.role ?? "").trim().toLowerCase()}`;
}

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
    const cacheKey = getCacheKey(decoded);
    const cached = authUserCache.get(cacheKey);
    let user = null;

    if (cached && cached.expiresAt > Date.now()) {
      user = cached.user;
    } else {
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

      user = rows[0];
      authUserCache.set(cacheKey, {
        user,
        expiresAt: Date.now() + AUTH_USER_TTL_MS,
      });
    }

    const reqUser = {
      ...user,
      permissions: await getUserPermissionKeys(user.id, user.role),
      profile_image: null,
      notification_preferences: {},
    };

    if (reqUser.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    req.user = reqUser;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}
