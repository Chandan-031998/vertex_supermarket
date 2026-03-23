import { query } from "../config/db.js";

export const PERMISSION_CATALOG = [
  ["Dashboard", "dashboard.view", "Dashboard Access"],
  ["POS Billing", "pos.view", "POS Access"],
  ["POS Billing", "pos.add", "Create Sale"],
  ["POS Billing", "pos.print", "Print Invoice"],
  ["POS Billing", "pos.hold", "Hold Bill"],
  ["POS Billing", "pos.resume", "Resume Held Bill"],
  ["POS Billing", "pos.refund", "Refund Sale"],
  ["Products", "products.view", "View Products"],
  ["Products", "products.add", "Add Products"],
  ["Products", "products.edit", "Edit Products"],
  ["Products", "products.delete", "Delete Products"],
  ["Categories", "categories.view", "View Categories"],
  ["Categories", "categories.add", "Add Categories"],
  ["Categories", "categories.edit", "Edit Categories"],
  ["Categories", "categories.delete", "Delete Categories"],
  ["Brands", "brands.view", "View Brands"],
  ["Brands", "brands.add", "Add Brands"],
  ["Brands", "brands.edit", "Edit Brands"],
  ["Brands", "brands.delete", "Delete Brands"],
  ["Inventory", "inventory.view", "View Inventory"],
  ["Inventory", "inventory.adjust", "Adjust Stock"],
  ["Inventory", "inventory.low_stock", "View Low Stock Alerts"],
  ["Inventory", "inventory.expiry", "View Expiry Alerts"],
  ["Suppliers", "suppliers.view", "View Suppliers"],
  ["Suppliers", "suppliers.add", "Add Suppliers"],
  ["Suppliers", "suppliers.edit", "Edit Suppliers"],
  ["Suppliers", "suppliers.delete", "Delete Suppliers"],
  ["Purchase Orders", "purchases.view", "View Purchase Orders"],
  ["Purchase Orders", "purchases.add", "Create Purchase Orders"],
  ["Purchase Orders", "purchases.edit", "Edit Purchase Orders"],
  ["Purchase Orders", "purchases.approve", "Approve Purchase Orders"],
  ["GRN", "grn.view", "View Goods Receipts"],
  ["GRN", "grn.receive", "Receive Goods"],
  ["Customers", "customers.view", "View Customers"],
  ["Customers", "customers.add", "Add Customers"],
  ["Customers", "customers.edit", "Edit Customers"],
  ["Customers", "customers.delete", "Delete Customers"],
  ["Loyalty", "loyalty.view", "View Loyalty"],
  ["Expenses", "expenses.view", "View Expenses"],
  ["Expenses", "expenses.add", "Add Expenses"],
  ["Expenses", "expenses.edit", "Edit Expenses"],
  ["GST Reports", "reports.gst", "View GST Reports"],
  ["GST Reports", "reports.export", "Export Reports"],
  ["Profit & Loss", "reports.pnl", "View Profit & Loss"],
  ["Sales Reports", "reports.sales", "View Sales Reports"],
  ["Purchase Reports", "reports.purchases", "View Purchase Reports"],
  ["Users", "users.view", "View Users"],
  ["Users", "users.add", "Add Users"],
  ["Users", "users.edit", "Edit Users"],
  ["Users", "users.delete", "Delete Users"],
  ["Roles", "roles.view", "View Roles"],
  ["Roles", "roles.add", "Add Roles"],
  ["Roles", "roles.edit", "Edit Roles"],
  ["Roles", "roles.delete", "Delete Roles"],
  ["Roles", "roles.permissions", "Manage Role Permissions"],
  ["Audit Logs", "audit.view", "View Audit Logs"],
  ["Settings", "settings.view", "View Settings"],
  ["Settings", "settings.manage", "Manage Settings"],
  ["App Customization", "customization.view", "View App Customization"],
  ["App Customization", "customization.manage", "Customize App"],
  ["Profile", "profile.view", "View Profile"],
  ["Profile", "profile.edit", "Edit Profile"],
];

function normalizeRoleName(roleName) {
  return String(roleName ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export async function ensurePermissionCatalog() {
  for (const [moduleName, permissionKey, permissionLabel] of PERMISSION_CATALOG) {
    await query(
      `INSERT INTO permissions (module_name, permission_key, permission_label)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         module_name = VALUES(module_name),
         permission_label = VALUES(permission_label)`,
      [moduleName, permissionKey, permissionLabel]
    );
  }
}

export async function getPermissionCatalog() {
  await ensurePermissionCatalog();

  const rows = await query(
    `SELECT id, module_name, permission_key, permission_label
     FROM permissions
     ORDER BY module_name ASC, permission_label ASC`
  );

  const modules = rows.reduce((accumulator, row) => {
    const bucket = accumulator.get(row.module_name) ?? [];
    bucket.push(row);
    accumulator.set(row.module_name, bucket);
    return accumulator;
  }, new Map());

  return Array.from(modules.entries()).map(([module_name, permissions]) => ({
    module_name,
    permissions,
  }));
}

export async function getRolePermissionKeys(roleId) {
  await ensurePermissionCatalog();

  const rows = await query(
    `SELECT p.permission_key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ? AND rp.is_allowed = 1`,
    [roleId]
  );

  return rows.map((row) => row.permission_key);
}

export async function getUserPermissionKeys(userId, roleName = "") {
  await ensurePermissionCatalog();

  if (normalizeRoleName(roleName) === "super_admin") {
    return PERMISSION_CATALOG.map(([, permissionKey]) => permissionKey);
  }

  const rows = await query(
    `SELECT p.permission_key
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id AND rp.is_allowed = 1
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = ?`,
    [userId]
  );

  return rows.map((row) => row.permission_key);
}
