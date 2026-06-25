import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const tenantStorage = new AsyncLocalStorage();

function mysqlConfigFromEnv() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url && /^mysql:\/\//i.test(url)) {
    return { uri: url, timezone: 'Z', supportBigNumbers: true, multipleStatements: false };
  }
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || 'beauty_home_service',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    timezone: 'Z',
    supportBigNumbers: true,
    multipleStatements: false
  };
}

const mysqlPool = mysql.createPool({
  ...mysqlConfigFromEnv(),
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  charset: 'utf8mb4'
});

const scopedTables = new Set([
  'artists',
  'artist_availability',
  'artist_reviews',
  'artist_reviews',
  'audit_logs',
  'beautician_coverage_regions',
  'beautician_coverage_cities',
  'beautician_coverage_districts',
  'beautician_portfolio',
  'beautician_reviews',
  'beautician_services',
  'booking_events',
  'booking_status_history',
  'bookings',
  'communication_templates',
  'customer_addresses',
  'customer_favorite_beauticians',
  'customer_otp_codes',
  'customers',
  'occasion_types',
  'payment_records',
  'service_categories',
  'services',
  'tenant_usage_snapshots'
]);

const sharedCatalogTables = new Set([
  'regions',
  'cities',
  'districts',
  'service_categories',
  'services',
  'occasion_types'
]);

export const pool = {
  async connect() {
    const connection = await mysqlPool.getConnection();
    return wrapConnection(connection);
  },
  async query(sql, params = []) {
    return query(sql, params);
  },
  async end() {
    await mysqlPool.end();
  }
};

export function runWithTenantContext(context, callback) {
  return tenantStorage.run(context || {}, callback);
}

export function getTenantContext() {
  return tenantStorage.getStore() || {};
}

function rowsResult(rows) {
  if (Array.isArray(rows)) return { rows };
  return { rows: [], rowCount: rows?.affectedRows || 0, insertId: rows?.insertId };
}

function splitReturning(sql) {
  const match = sql.match(/\s+RETURNING\s+([\s\S]+)$/i);
  if (!match) return { sql, returning: null };
  return { sql: sql.slice(0, match.index).trim(), returning: match[1].trim() };
}

function convertConflict(sql) {
  let next = sql;
  next = next.replace(/\s+ON\s+CONFLICT\s+DO\s+NOTHING/gi, ' ON DUPLICATE KEY UPDATE id=id');
  next = next.replace(/\s+ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+NOTHING/gi, ' ON DUPLICATE KEY UPDATE id=id');
  next = next.replace(/\s+ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+UPDATE\s+SET\s+/gi, ' ON DUPLICATE KEY UPDATE ');
  next = next.replace(/EXCLUDED\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'VALUES($1)');
  return next;
}

function convertArrays(sql) {
  return sql.replace(/ARRAY\(SELECT\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:::text)?\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+WHERE\s+([^)]+)\)\s+AS\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    '(SELECT COALESCE(JSON_ARRAYAGG($1), JSON_ARRAY()) FROM $2 WHERE $3) AS $4');
}

function normalizeSql(sql) {
  let next = String(sql || '').trim();
  next = convertConflict(next);
  next = convertArrays(next);
  next = next.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+"?uuid-ossp"?/i, 'SELECT 1');
  next = next.replace(/COUNT\(\*\)::int/gi, 'COUNT(*)');
  next = next.replace(/\)::int/gi, ')');
  next = next.replace(/::(?:uuid|text|varchar|int|bigint|numeric|jsonb|date|time)\b/gi, '');
  next = next.replace(/'([^']*)'::jsonb/gi, "'$1'");
  next = next.replace(/\bJSONB\b/gi, 'JSON');
  next = next.replace(/\bTIMESTAMPTZ\b/gi, 'TIMESTAMP');
  next = next.replace(/\bTRUE\b/g, '1').replace(/\bFALSE\b/g, '0');
  next = next.replace(/\bCURRENT_DATE\b/g, 'CURDATE()');
  next = next.replace(/NOW\(\)\s*-\s*INTERVAL\s+'(\d+)\s+minutes?'/gi, 'DATE_SUB(NOW(), INTERVAL $1 MINUTE)');
  next = next.replace(/NOW\(\)\s*\+\s*INTERVAL\s+'(\d+)\s+minutes?'/gi, 'DATE_ADD(NOW(), INTERVAL $1 MINUTE)');
  next = next.replace(/([a-zA-Z0-9_.]+)\s*=\s*ANY\(\$(\d+)(?:(?:::uuid)?\[\])?\)/gi, '$1 IN ($$$2)');
  next = next.replace(/\$(\d+)\[\]/g, '$$$1');
  next = next.replace(
    /ORDER BY\s+([^,\n]+?)(?:\s+(ASC|DESC))?\s+NULLS\s+LAST/gi,
    (_, expression, direction = '') => `ORDER BY (${expression.trim()} IS NULL), ${expression.trim()}${direction ? ` ${direction}` : ''}`
  );
  return next;
}

function convertPlaceholders(sql, params = []) {
  const values = [];
  const converted = sql.replace(/\$(\d+)/g, (_, index) => {
    values.push(params[Number(index) - 1]);
    return '?';
  });
  return { sql: converted, params: values.length ? values : params };
}

function returningColumns(returning) {
  if (!returning || returning === '*') return '*';
  return returning
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.replace(/\s+AS\s+.*/i, ''))
    .join(', ');
}

function prepareInsertReturning(sql, params) {
  const match = sql.match(/^INSERT\s+INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s*\(([^)]+)\)\s*VALUES\s*\(([\s\S]+)\)$/i);
  if (!match) return { sql, params, id: params[params.length - 1] };
  const table = match[1];
  const columns = match[2].split(',').map(col => col.trim().replace(/[`"]/g, ''));
  if (columns.includes('id')) {
    return { sql, params, id: params[columns.indexOf('id')] };
  }
  const id = randomUUID();
  const withId = sql.replace(
    /^INSERT\s+INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s*\(/i,
    `INSERT INTO ${table} (id, `
  ).replace(/\)\s*VALUES\s*\(/i, ') VALUES (?, ');
  return { sql: withId, params: [id, ...params], id };
}

function topLevelRegexMatch(sql, patterns) {
  let depth = 0;
  let quote = null;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (quote) {
      if (char === '\\') {
        i += 1;
      } else if (char === quote) {
        if (quote === "'" && next === "'") i += 1;
        else quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') {
      depth += 1;
      continue;
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0) continue;

    const slice = sql.slice(i);
    for (const pattern of patterns) {
      const match = slice.match(pattern);
      if (match) return { index: i, match };
    }
  }

  return null;
}

function splitTopLevelList(value) {
  const items = [];
  let depth = 0;
  let quote = null;
  let start = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const next = value[i + 1];

    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) {
        if (quote === "'" && next === "'") i += 1;
        else quote = null;
      }
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      items.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }

  items.push(value.slice(start).trim());
  return items;
}

function addTenantScope(sql, params) {
  const { tenantId, role } = getTenantContext();
  if (!tenantId || role === 'super_admin') return { sql, params };
  const normalized = sql.trim();
  const command = normalized.split(/\s+/, 1)[0]?.toUpperCase();

  if (command === 'INSERT') {
    const match = normalized.match(/^INSERT\s+INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s*\(([^)]+)\)\s*VALUES\s*\(/i);
    if (!match || !scopedTables.has(match[1])) return { sql, params };
    const columns = match[2].split(',').map(col => col.trim().replace(/[`"]/g, ''));
    if (columns.includes('tenant_id')) {
      const valuesMatch = normalized.match(/^INSERT\s+INTO\s+`?[a-zA-Z_][a-zA-Z0-9_]*`?\s*\([^)]+\)\s*VALUES\s*\(([\s\S]+)\)$/i);
      if (!valuesMatch) return { sql, params };
      const values = splitTopLevelList(valuesMatch[1]);
      const tenantColumnIndex = columns.indexOf('tenant_id');
      const tenantValue = values[tenantColumnIndex] || '';
      if (!tenantValue.includes('?')) return { sql, params };
      const paramIndex = values.slice(0, tenantColumnIndex + 1).filter(value => value.includes('?')).length - 1;
      if (paramIndex < 0 || paramIndex >= params.length) return { sql, params };
      const scopedParams = [...params];
      scopedParams[paramIndex] = tenantId;
      return { sql, params: scopedParams };
    }
    const withTenant = sql.replace(
      /^INSERT\s+INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s*\(/i,
      `INSERT INTO ${match[1]} (tenant_id, `
    ).replace(/\)\s*VALUES\s*\(/i, ') VALUES (?, ');
    return { sql: withTenant, params: [tenantId, ...params] };
  }

  if (command === 'UPDATE') {
    const match = normalized.match(/^UPDATE\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?\s+SET\s+/i);
    if (!match || !scopedTables.has(match[1])) return { sql, params };
    return addCondition(sql, params, `${match[1]}.tenant_id=?`, tenantId);
  }

  if (command === 'DELETE') {
    const match = normalized.match(/^DELETE\s+FROM\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i);
    if (!match || !scopedTables.has(match[1])) return { sql, params };
    return addCondition(sql, params, `tenant_id=?`, tenantId);
  }

  if (command === 'SELECT') {
    const source = topLevelRegexMatch(normalized, [/^FROM\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?(?:\s+([a-zA-Z_][a-zA-Z0-9_]*))?/i]);
    if (!source || !scopedTables.has(source.match[1])) return { sql, params };
    const alias = source.match[2] && !['WHERE', 'LEFT', 'JOIN', 'INNER', 'ORDER', 'GROUP', 'LIMIT'].includes(source.match[2].toUpperCase())
      ? source.match[2]
      : source.match[1];
    const condition = sharedCatalogTables.has(source.match[1])
      ? `(${alias}.tenant_id=? OR ${alias}.tenant_id IS NULL)`
      : `${alias}.tenant_id=?`;
    return addCondition(sql, params, condition, tenantId);
  }

  return { sql, params };
}

function addCondition(sql, params, condition, value) {
  const clause = topLevelRegexMatch(sql, [/^ORDER\s+BY\b/i, /^GROUP\s+BY\b/i, /^LIMIT\b/i]);
  const marker = clause ? clause.index : -1;
  const head = marker === -1 ? sql : sql.slice(0, marker);
  const tail = marker === -1 ? '' : sql.slice(marker);
  const hasWhere = !!topLevelRegexMatch(head, [/^WHERE\b/i]);
  return {
    sql: `${head}${hasWhere ? ' AND ' : ' WHERE '}${condition}${tail}`,
    params: [...params, value]
  };
}

function valueForWhereId(sql, params) {
  const matches = [...String(sql).matchAll(/\bid\s*=\s*\?/gi)];
  const match = matches[matches.length - 1];
  if (!match) return params[params.length - 1];
  const paramIndex = (sql.slice(0, match.index).match(/\?/g) || []).length;
  return params[paramIndex];
}

async function nextBookingSequence(executor) {
  await executor('INSERT IGNORE INTO booking_number_counter (id, seq) VALUES (1, 0)', []);
  await executor('UPDATE booking_number_counter SET seq=LAST_INSERT_ID(seq + 1) WHERE id=1', []);
  const result = await executor('SELECT LAST_INSERT_ID() AS seq', []);
  return { rows: [{ seq: result.rows[0]?.seq || 1 }] };
}

function wrapConnection(connection) {
  const run = async (sql, params = []) => runMysql(connection, sql, params);
  return {
    async query(sql, params = []) { return run(sql, params); },
    async beginTransaction() { await connection.query('START TRANSACTION'); },
    async commit() { await connection.query('COMMIT'); },
    async rollback() { await connection.query('ROLLBACK'); },
    release() { connection.release(); }
  };
}

async function runMysql(connection, rawSql, rawParams = []) {
  if (/SELECT\s+nextval\('booking_number_seq'\)/i.test(rawSql)) {
    return nextBookingSequence((sql, params) => runMysql(connection, sql, params));
  }

  const { sql: withoutReturning, returning } = splitReturning(normalizeSql(rawSql));
  let converted = convertPlaceholders(withoutReturning, rawParams);
  converted = addTenantScope(converted.sql, converted.params);

  if (/^INSERT\b/i.test(converted.sql) && returning) {
    const prepared = prepareInsertReturning(converted.sql, converted.params);
    await connection.query(prepared.sql, prepared.params);
    const [rows] = await connection.query(`SELECT ${returningColumns(returning)} FROM ${prepared.sql.match(/^INSERT\s+INTO\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i)[1]} WHERE id=? LIMIT 1`, [prepared.id]);
    return rowsResult(rows);
  }

  if (/^UPDATE\b/i.test(converted.sql) && returning) {
    const table = converted.sql.match(/^UPDATE\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/i)?.[1];
    const id = valueForWhereId(converted.sql, converted.params);
    const [updateResult] = await connection.query(converted.sql, converted.params);
    if (!updateResult?.affectedRows) return rowsResult([]);
    if (table && id) {
      const { tenantId, role } = getTenantContext();
      const shouldScope = tenantId && role !== 'super_admin' && scopedTables.has(table);
      const [rows] = shouldScope
        ? await connection.query(`SELECT ${returningColumns(returning)} FROM ${table} WHERE id=? AND tenant_id=? LIMIT 1`, [id, tenantId])
        : await connection.query(`SELECT ${returningColumns(returning)} FROM ${table} WHERE id=? LIMIT 1`, [id]);
      return rowsResult(rows);
    }
    return rowsResult([]);
  }

  const [rows] = await connection.query(converted.sql, converted.params);
  return rowsResult(rows);
}

export async function query(sql, params = []) {
  const connection = await mysqlPool.getConnection();
  try {
    return await runMysql(connection, sql, params);
  } finally {
    connection.release();
  }
}

export async function transaction(callback) {
  const connection = await mysqlPool.getConnection();
  const client = wrapConnection(connection);
  try {
    await client.beginTransaction();
    const result = await callback(client);
    await client.commit();
    return result;
  } catch (error) {
    await client.rollback().catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}
