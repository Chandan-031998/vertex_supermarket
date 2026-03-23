import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { getUserPermissionKeys } from "../services/permission.service.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const rows = await query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.status, r.name AS role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.email = ? LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = rows[0];
    const permissions = await getUserPermissionKeys(user.id, user.role);

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profile_image: null,
          notification_preferences: {},
          permissions,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      full_name: req.user.full_name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      profile_image: req.user.profile_image,
      notification_preferences: req.user.notification_preferences,
      permissions: req.user.permissions,
    },
  });
};
