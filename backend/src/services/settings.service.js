import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

const DEFAULT_SETTINGS = {
  app_name: "Vertex Supermarket",
  app_heading: "Vertex Supermarket",
  app_tagline: "Management System",
  company_name: "Vertex Supermarket",
  footer_text: "Vertex Supermarket ERP",
  login_title: "Vertex Supermarket",
  login_subtitle: "Login to manage billing, products, inventory, and reports.",
  logo_path: null,
  favicon_path: null,
  login_bg_path: null,
  primary_color: "#059669",
  sidebar_color: "#0f172a",
  navbar_color: "#ffffff",
  button_color: "#059669",
  card_accent_color: "#10b981",
  theme_mode: "light",
  sidebar_collapsed: 0,
  show_logo_text: 1,
  compact_mode: 0,
  table_density: "comfortable",
  border_radius: "xl",
};

function parseNotificationPreferences(value) {
  if (!value) {
    return { email: true, system: true, billing: true };
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return { email: true, system: true, billing: true };
  }
}

export async function ensureAppSettingsRow() {
  const rows = await query("SELECT id FROM app_settings LIMIT 1");

  if (!rows.length) {
    await query(
      `INSERT INTO app_settings (
         app_name, app_heading, app_tagline, company_name, footer_text,
         login_title, login_subtitle, logo_path, favicon_path, login_bg_path,
         primary_color, sidebar_color, navbar_color, button_color, card_accent_color,
         theme_mode, sidebar_collapsed, show_logo_text, compact_mode, table_density, border_radius
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_SETTINGS.app_name,
        DEFAULT_SETTINGS.app_heading,
        DEFAULT_SETTINGS.app_tagline,
        DEFAULT_SETTINGS.company_name,
        DEFAULT_SETTINGS.footer_text,
        DEFAULT_SETTINGS.login_title,
        DEFAULT_SETTINGS.login_subtitle,
        DEFAULT_SETTINGS.logo_path,
        DEFAULT_SETTINGS.favicon_path,
        DEFAULT_SETTINGS.login_bg_path,
        DEFAULT_SETTINGS.primary_color,
        DEFAULT_SETTINGS.sidebar_color,
        DEFAULT_SETTINGS.navbar_color,
        DEFAULT_SETTINGS.button_color,
        DEFAULT_SETTINGS.card_accent_color,
        DEFAULT_SETTINGS.theme_mode,
        DEFAULT_SETTINGS.sidebar_collapsed,
        DEFAULT_SETTINGS.show_logo_text,
        DEFAULT_SETTINGS.compact_mode,
        DEFAULT_SETTINGS.table_density,
        DEFAULT_SETTINGS.border_radius,
      ]
    );
  }
}

export async function getAppSettings() {
  await ensureAppSettingsRow();
  const rows = await query("SELECT * FROM app_settings ORDER BY id ASC LIMIT 1");
  return { ...DEFAULT_SETTINGS, ...rows[0] };
}

export async function updateAppSettings(payload, user, ipAddress) {
  await ensureAppSettingsRow();

  const current = await getAppSettings();
  const next = {
    ...current,
    ...payload,
    sidebar_collapsed: payload.sidebar_collapsed ?? payload.sidebarCollapsed ?? current.sidebar_collapsed,
    show_logo_text: payload.show_logo_text ?? payload.showLogoText ?? current.show_logo_text,
    compact_mode: payload.compact_mode ?? payload.compactMode ?? current.compact_mode,
  };

  await query(
    `UPDATE app_settings
     SET app_name = ?, app_heading = ?, app_tagline = ?, company_name = ?, footer_text = ?,
         login_title = ?, login_subtitle = ?, logo_path = ?, favicon_path = ?, login_bg_path = ?,
         primary_color = ?, sidebar_color = ?, navbar_color = ?, button_color = ?, card_accent_color = ?,
         theme_mode = ?, sidebar_collapsed = ?, show_logo_text = ?, compact_mode = ?, table_density = ?,
         border_radius = ?, updated_by = ?
     WHERE id = ?`,
    [
      next.app_name,
      next.app_heading,
      next.app_tagline,
      next.company_name,
      next.footer_text,
      next.login_title,
      next.login_subtitle,
      next.logo_path || null,
      next.favicon_path || null,
      next.login_bg_path || null,
      next.primary_color,
      next.sidebar_color,
      next.navbar_color,
      next.button_color,
      next.card_accent_color,
      next.theme_mode,
      Number(Boolean(next.sidebar_collapsed)),
      Number(Boolean(next.show_logo_text)),
      Number(Boolean(next.compact_mode)),
      next.table_density,
      next.border_radius,
      user.id,
      current.id,
    ]
  );

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    module: "APP_SETTINGS",
    recordId: current.id,
    description: "Updated application customization settings",
    ipAddress,
  });

  return getAppSettings();
}

export async function getProfile(userId) {
  const rows = await query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.profile_image, u.notification_preferences, r.name AS role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    throw new AppError("User not found", 404);
  }

  return {
    ...rows[0],
    notification_preferences: parseNotificationPreferences(rows[0].notification_preferences),
  };
}

export async function updateProfile(userId, payload, user, ipAddress) {
  await query(
    `UPDATE users
     SET full_name = ?, email = ?, phone = ?, profile_image = ?, notification_preferences = ?
     WHERE id = ?`,
    [
      String(payload.full_name ?? payload.fullName ?? "").trim(),
      String(payload.email ?? "").trim().toLowerCase(),
      String(payload.phone ?? "").trim() || null,
      String(payload.profile_image ?? payload.profileImage ?? "").trim() || null,
      JSON.stringify(payload.notification_preferences ?? payload.notificationPreferences ?? {}),
      userId,
    ]
  );

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    module: "PROFILE",
    recordId: userId,
    description: "Updated profile settings",
    ipAddress,
  });

  return getProfile(userId);
}

export async function changeProfilePassword(userId, payload, user, ipAddress) {
  const { current_password, new_password } = payload;
  const rows = await query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [userId]);

  if (!rows.length) {
    throw new AppError("User not found", 404);
  }

  const isMatch = await bcrypt.compare(String(current_password ?? ""), rows[0].password_hash);
  if (!isMatch) {
    throw new AppError("Current password is incorrect", 400);
  }

  const nextHash = await bcrypt.hash(String(new_password ?? ""), 10);
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [nextHash, userId]);

  await logAudit({
    userId: user.id,
    action: "PASSWORD_CHANGE",
    module: "PROFILE",
    recordId: userId,
    description: "Changed account password",
    ipAddress,
  });

  return { id: userId };
}
