import pool, { query } from "../config/db.js";

export async function logAudit({
  connection = null,
  userId = null,
  action,
  module,
  recordId = null,
  description = null,
  ipAddress = null,
}) {
  const executor = connection ?? { execute: (sql, params) => query(sql, params) };

  await executor.execute(
    `INSERT INTO audit_logs (user_id, action, module, record_id, description, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, module, recordId, description, ipAddress]
  );
}

export { pool };
