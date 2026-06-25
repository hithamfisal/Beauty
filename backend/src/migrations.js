import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { pool } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.resolve(here, '../database');
const mysqlSchemaPath = path.join(databaseDir, 'mysql-schema.sql');

const tenantScopedTables = [
  'artists',
  'artist_availability',
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
  'regions',
  'service_categories',
  'services',
  'tenant_usage_snapshots'
];

function splitSql(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?`,
    [tableName]
  );
  return Number(result.rows[0]?.count || 0) > 0;
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
    [tableName, columnName]
  );
  return Number(result.rows[0]?.count || 0) > 0;
}

async function tenantIndexExists(client, tableName) {
  const result = await client.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME='tenant_id'`,
    [tableName]
  );
  return Number(result.rows[0]?.count || 0) > 0;
}

async function ensureColumn(client, tableName, columnName, definition) {
  if (!await tableExists(client, tableName)) return;
  if (await columnExists(client, tableName, columnName)) return;
  await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function ensureTenantColumns(client) {
  for (const tableName of tenantScopedTables) {
    await ensureColumn(client, tableName, 'tenant_id', 'CHAR(36) NULL');
    if (await tableExists(client, tableName) && !await tenantIndexExists(client, tableName)) {
      await client.query(`ALTER TABLE ${tableName} ADD INDEX idx_${tableName}_tenant_id (tenant_id)`);
    }
  }
}

async function ensureOperationalTables(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS auth_login_attempts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    identity VARCHAR(190) NOT NULL,
    ip_address VARCHAR(80),
    successful TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auth_login_attempts_identity_ip (identity, ip_address, created_at),
    INDEX idx_auth_login_attempts_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function ensureSchemaCompatibility(client) {
  await ensureTenantColumns(client);
  await ensureOperationalTables(client);
}

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(160) PRIMARY KEY,
      checksum VARCHAR(64),
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    const schema = await fs.readFile(mysqlSchemaPath, 'utf8');
    const checksum = createHash('sha256').update(schema).digest('hex');
    const current = await client.query('SELECT checksum FROM schema_migrations WHERE version=? LIMIT 1', ['mysql-schema']);

    if (current.rows[0]?.checksum === checksum) {
      await ensureSchemaCompatibility(client);
      return;
    }

    for (const statement of splitSql(schema)) {
      await client.query(statement);
    }

    await ensureSchemaCompatibility(client);

    if (current.rows[0]) {
      await client.query('UPDATE schema_migrations SET checksum=?, applied_at=CURRENT_TIMESTAMP WHERE version=?', [checksum, 'mysql-schema']);
    } else {
      await client.query('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)', ['mysql-schema', checksum]);
    }
  } finally {
    client.release();
  }
}
