import { query } from "../config/db.js";
import { AppError } from "../utils/appError.js";
import { logAudit } from "../utils/audit.js";
import { ensurePermissionCatalog, getPermissionCatalog, getRolePermissionKeys } from "./permission.service.js";

function normalizeRole(payload = {}) {
  return {
    name: String(payload.name ?? "").trim(),
    description: String(payload.description ?? "").trim() || null,
    status: payload.status === "inactive" ? "inactive" : "active",
  };
}

function isProtectedRole(roleName) {
  return String(roleName ?? "")
    .trim()
    .toLowerCase() === "super admin";
}

export async function listRoles() {
  await ensurePermissionCatalog();

  return query(
    `SELECT r.*,
            COUNT(DISTINCT u.id) AS user_count,
            COUNT(DISTINCT CASE WHEN rp.is_allowed = 1 THEN rp.permission_id END) AS permission_count
     FROM roles r
     LEFT JOIN users u ON u.role_id = r.id
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id
     ORDER BY r.name ASC`
  );
}

export async function getRoleById(roleId) {
  const rows = await query("SELECT * FROM roles WHERE id = ? LIMIT 1", [roleId]);
  if (!rows.length) {
    throw new AppError("Role not found", 404);
  }

  const [permissions, users] = await Promise.all([
    getRolePermissionKeys(roleId),
    query(
      `SELECT id, full_name, email, status
       FROM users
       WHERE role_id = ?
       ORDER BY full_name ASC`,
      [roleId]
    ),
  ]);

  return {
    ...rows[0],
    permissions,
    users,
  };
}

export async function createRole(payload, user, ipAddress) {
  const data = normalizeRole(payload);

  if (!data.name) {
    throw new AppError("Role name is required", 400);
  }

  const duplicate = await query("SELECT id FROM roles WHERE name = ? LIMIT 1", [data.name]);
  if (duplicate.length) {
    throw new AppError("Role already exists", 409);
  }

  const result = await query(
    `INSERT INTO roles (name, description, status)
     VALUES (?, ?, ?)`,
    [data.name, data.description, data.status]
  );

  await logAudit({
    userId: user.id,
    action: "CREATE",
    module: "ROLE",
    recordId: result.insertId,
    description: `Created role ${data.name}`,
    ipAddress,
  });

  return getRoleById(result.insertId);
}

export async function updateRole(roleId, payload, user, ipAddress) {
  const existing = await getRoleById(roleId);
  const data = normalizeRole({ ...existing, ...payload });

  if (isProtectedRole(existing.name) && data.status === "inactive") {
    throw new AppError("Super Admin role cannot be deactivated", 400);
  }

  const duplicate = await query("SELECT id FROM roles WHERE name = ? AND id <> ? LIMIT 1", [data.name, roleId]);
  if (duplicate.length) {
    throw new AppError("Role already exists", 409);
  }

  await query(
    `UPDATE roles
     SET name = ?, description = ?, status = ?
     WHERE id = ?`,
    [data.name, data.description, data.status, roleId]
  );

  await logAudit({
    userId: user.id,
    action: "UPDATE",
    module: "ROLE",
    recordId: roleId,
    description: `Updated role ${data.name}`,
    ipAddress,
  });

  return getRoleById(roleId);
}

export async function deleteRole(roleId, user, ipAddress) {
  const existing = await getRoleById(roleId);

  if (isProtectedRole(existing.name)) {
    throw new AppError("Super Admin role cannot be deleted", 400);
  }

  if ((existing.users || []).length > 0) {
    throw new AppError("Role cannot be deleted while users are assigned to it", 400);
  }

  await query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
  await query("DELETE FROM roles WHERE id = ?", [roleId]);

  await logAudit({
    userId: user.id,
    action: "DELETE",
    module: "ROLE",
    recordId: roleId,
    description: `Deleted role ${existing.name}`,
    ipAddress,
  });

  return { id: roleId };
}

export async function getRolePermissionMatrix(roleId) {
  const role = await getRoleById(roleId);
  const catalog = await getPermissionCatalog();

  return {
    role,
    catalog,
    allowed_permissions: role.permissions,
  };
}

export async function saveRolePermissions(roleId, permissionKeys = [], user, ipAddress) {
  const role = await getRoleById(roleId);
  await ensurePermissionCatalog();

  const allPermissions = await query("SELECT id, permission_key FROM permissions ORDER BY id ASC");
  const allowedSet = new Set(permissionKeys);

  for (const permission of allPermissions) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id, is_allowed)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_allowed = VALUES(is_allowed),
         updated_at = CURRENT_TIMESTAMP`,
      [roleId, permission.id, allowedSet.has(permission.permission_key) ? 1 : 0]
    );
  }

  await logAudit({
    userId: user.id,
    action: "PERMISSIONS_UPDATE",
    module: "ROLE",
    recordId: roleId,
    description: `Updated permissions for role ${role.name}`,
    ipAddress,
  });

  return getRolePermissionMatrix(roleId);
}

export async function assignUserToRole(roleId, userId, actor, ipAddress) {
  const role = await getRoleById(roleId);
  const users = await query("SELECT id, full_name FROM users WHERE id = ? LIMIT 1", [userId]);

  if (!users.length) {
    throw new AppError("User not found", 404);
  }

  await query("UPDATE users SET role_id = ? WHERE id = ?", [roleId, userId]);

  await logAudit({
    userId: actor.id,
    action: "ASSIGN_ROLE",
    module: "ROLE",
    recordId: roleId,
    description: `Assigned user ${users[0].full_name} to role ${role.name}`,
    ipAddress,
  });

  return getRoleById(roleId);
}
