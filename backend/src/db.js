import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const sslDisabled = process.env.PGSSLMODE === 'disable' || process.env.DATABASE_SSL === 'false';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction && !sslDisabled ? { rejectUnauthorized: false } : undefined
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}
