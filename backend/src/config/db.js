import { Pool } from "pg";
import env from "./env.js";

function toPgPlaceholders(sql) {
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let output = "";

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (!inSingleQuote && !inDoubleQuote && !inBlockComment && char === "-" && next === "-") {
      inLineComment = true;
      output += char;
      continue;
    }

    if (inLineComment) {
      output += char;
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !inBlockComment && char === "/" && next === "*") {
      inBlockComment = true;
      output += char;
      continue;
    }

    if (inBlockComment) {
      output += char;
      if (char === "*" && next === "/") {
        output += "/";
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      output += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      output += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === "?") {
      index += 1;
      output += `$${index}`;
      continue;
    }

    output += char;
  }

  return output;
}

function normalizeSql(sql) {
  return String(sql)
    .replace(/CURDATE\(\)/gi, "CURRENT_DATE")
    .replace(
      /DATE_ADD\s*\(\s*CURRENT_DATE\s*,\s*INTERVAL\s+\?\s+DAY\s*\)/gi,
      "(CURRENT_DATE + (? * INTERVAL '1 day'))",
    )
    .trim();
}

function needsAutoReturningId(sql) {
  const normalized = sql.trim().toUpperCase();
  return normalized.startsWith("INSERT INTO") && !/\bRETURNING\b/i.test(normalized);
}

function buildWriteResult(result, includeInsertId = false) {
  return {
    affectedRows: result.rowCount ?? 0,
    changedRows: result.rowCount ?? 0,
    insertId: includeInsertId ? (result.rows?.[0]?.id ?? null) : null,
    rows: result.rows ?? [],
  };
}

async function run(client, sql, params = []) {
  const normalizedSql = normalizeSql(sql);
  const sqlWithParams = toPgPlaceholders(normalizedSql);
  const finalSql = needsAutoReturningId(sqlWithParams) ? `${sqlWithParams} RETURNING id` : sqlWithParams;
  const result = await client.query(finalSql, params);
  const command = (result.command || "").toUpperCase();

  if (command === "SELECT") {
    return result.rows;
  }

  return buildWriteResult(result, command === "INSERT");
}

function normalizeConnectionString(rawUrl) {
  const parsed = new URL(rawUrl);
  if (parsed.searchParams.has("sslmode")) {
    parsed.searchParams.delete("sslmode");
  }
  return parsed.toString();
}

function createPool(rawUrl) {
  return new Pool({
    connectionString: normalizeConnectionString(rawUrl),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

const preferredConnectionString = env.SUPABASE_POOLER_URL || env.DATABASE_URL;
const preferredConnectionType = env.SUPABASE_POOLER_URL ? "pooler" : "direct";

if (!preferredConnectionString) {
  throw new Error("SUPABASE_POOLER_URL or DATABASE_URL is required. Please set it in backend/.env");
}

let activePool = createPool(preferredConnectionString);

export async function testDatabaseConnection() {
  const client = await activePool.connect();
  try {
    const result = await client.query("SELECT NOW() AS db_time");
    return {
      ok: true,
      mode: preferredConnectionType,
      dbTime: result.rows?.[0]?.db_time ?? null,
    };
  } finally {
    client.release();
  }
}

export const query = async (sql, params = []) => run(activePool, sql, params);

const db = {
  async getConnection() {
    const client = await activePool.connect();
    return {
      async beginTransaction() {
        await client.query("BEGIN");
      },
      async commit() {
        await client.query("COMMIT");
      },
      async rollback() {
        await client.query("ROLLBACK");
      },
      async execute(sql, params = []) {
        const data = await run(client, sql, params);
        return [data];
      },
      release() {
        client.release();
      },
    };
  },
  async end() {
    await activePool.end();
  },
};

export default db;
