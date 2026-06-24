import pg from 'pg';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';
dotenv.config();

const tenantStorage = new AsyncLocalStorage();

const connectionString = process.env.DATABASE_URL;
const isCloudPostgres = connectionString && /neon\.tech|sslmode=require|amazonaws\.com|supabase\.co/i.test(connectionString);

export const pool = new pg.Pool({
  connectionString,
  ssl: isCloudPostgres ? { rejectUnauthorized: false } : undefined
});

export function runWithTenantContext(context, callback) {
  return tenantStorage.run(context || {}, callback);
}

export function getTenantContext() {
  return tenantStorage.getStore() || {};
}

async function setTenantOnClient(client, tenantId, role) {
  if (role) await client.query('SELECT set_config($1, $2, true)', ['app.current_role', String(role)]);
  if (tenantId) await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant', String(tenantId)]);
}

export async function query(text, params = []) {
  const { tenantId, role } = getTenantContext();
  if (!tenantId && !role) return pool.query(text, params);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantOnClient(client, tenantId, role);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantOnClient(client, getTenantContext().tenantId, getTenantContext().role);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
