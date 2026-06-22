import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { pool } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.resolve(here, '../database');
const migrationsDir = path.join(databaseDir, 'migrations');

async function migrationFiles() {
  const files = await fs.readdir(migrationsDir);
  return files.filter(name => /^\d+_.+\.sql$/.test(name)).sort();
}

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [20260621]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(160) PRIMARY KEY,
      checksum VARCHAR(64),
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query(`ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)`);

    const appliedResult = await client.query('SELECT version, checksum FROM schema_migrations');
    const applied = new Map(appliedResult.rows.map(row => [row.version, row.checksum]));
    const files = await migrationFiles();

    for (const file of files) {
      let sql;
      if (file === '001_baseline.sql') {
        sql = await fs.readFile(path.join(databaseDir, 'schema.sql'), 'utf8');
      } else {
        sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      }
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (applied.has(file)) {
        const recorded = applied.get(file);
        if (recorded && recorded !== checksum) throw new Error(`Applied migration ${file} has been modified.`);
        if (!recorded) await client.query(`UPDATE schema_migrations SET checksum=$2 WHERE version=$1`, [file, checksum]);
        continue;
      }

      if (file === '001_baseline.sql') {
        const existing = await client.query(`SELECT to_regclass('public.bookings') AS bookings`);
        if (existing.rows[0].bookings) {
          await client.query('INSERT INTO schema_migrations (version,checksum) VALUES ($1,$2)', [file, checksum]);
          continue;
        }
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version,checksum) VALUES ($1,$2)', [file, checksum]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        error.message = `Migration ${file} failed: ${error.message}`;
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [20260621]).catch(() => null);
    client.release();
  }
}
