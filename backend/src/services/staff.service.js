import bcrypt from "bcryptjs";
import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";

export async function getStaffBootstrap() {
  const [users, roles, auditLogs, shifts] = await Promise.all([
    query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.role_id, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       ORDER BY u.id DESC`
    ),
    query("SELECT * FROM roles ORDER BY name ASC"),
    query(
      `SELECT al.*, u.full_name AS user_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT 100`
    ),
    query(
      `SELECT s.*, u.full_name AS user_name
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.shift_date DESC, s.id DESC
       LIMIT 50`
    ),
  ]);

  return { users, roles, audit_logs: auditLogs, shifts };
}

export async function createRole(payload, user, ipAddress) {
  const name = String(payload.name ?? "").trim();
  if (!name) {
    throw new AppError("Role name is required", 400);
  }

  const result = await query(
    "INSERT INTO roles (name, description) VALUES (?, ?)",
    [name, String(payload.description ?? "").trim() || null]
  );

  await logAudit({
    userId: user.id,
    action: "CREATE",
    module: "ROLE",
    recordId: result.insertId,
    description: `Created role ${name}`,
    ipAddress,
  });

  return query("SELECT * FROM roles WHERE id = ? LIMIT 1", [result.insertId]).then((rows) => rows[0]);
}

export async function createUser(payload, user, ipAddress) {
  const email = String(payload.email ?? "").trim().toLowerCase();
  const fullName = String(payload.full_name ?? payload.fullName ?? "").trim();
  const password = String(payload.password ?? "").trim();
  const roleId = Number(payload.role_id ?? payload.roleId);

  if (!email || !fullName || !password || !roleId) {
    throw new AppError("Full name, email, password, and role are required", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (role_id, full_name, email, phone, password_hash, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      roleId,
      fullName,
      email,
      String(payload.phone ?? "").trim() || null,
      passwordHash,
      payload.status === "inactive" ? "inactive" : "active",
    ]
  );

  await logAudit({
    userId: user.id,
    action: "CREATE",
    module: "USER",
    recordId: result.insertId,
    description: `Created user ${email}`,
    ipAddress,
  });

  return getStaffBootstrap();
}

export async function changePassword(userId, payload, actor, ipAddress) {
  const password = String(payload.password ?? "").trim();
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);

  await logAudit({
    userId: actor.id,
    action: "PASSWORD_RESET",
    module: "USER",
    recordId: userId,
    description: `Reset password for user ${userId}`,
    ipAddress,
  });

  return { id: userId };
}

export async function toggleShift(payload, user, ipAddress) {
  const action = String(payload.action ?? "").trim().toLowerCase();
  if (!["start", "end"].includes(action)) {
    throw new AppError("Shift action must be start or end", 400);
  }

  if (action === "start") {
    const result = await query(
      `INSERT INTO shifts (user_id, shift_date, start_time, notes)
       VALUES (?, CURDATE(), NOW(), ?)`,
      [user.id, String(payload.notes ?? "").trim() || null]
    );

    await logAudit({
      userId: user.id,
      action: "SHIFT_START",
      module: "SHIFT",
      recordId: result.insertId,
      description: "Started shift",
      ipAddress,
    });

    return { id: result.insertId };
  }

  const openShifts = await query(
    "SELECT id FROM shifts WHERE user_id = ? AND end_time IS NULL ORDER BY id DESC LIMIT 1",
    [user.id]
  );

  if (!openShifts.length) {
    throw new AppError("No active shift found", 400);
  }

  await query(
    `UPDATE shifts
     SET end_time = NOW(), notes = CONCAT(COALESCE(notes, ''), ?)
     WHERE id = ?`,
    [payload.notes ? ` | ${payload.notes}` : "", openShifts[0].id]
  );

  await logAudit({
    userId: user.id,
    action: "SHIFT_END",
    module: "SHIFT",
    recordId: openShifts[0].id,
    description: "Ended shift",
    ipAddress,
  });

  return { id: openShifts[0].id };
}
