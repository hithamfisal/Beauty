import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const isCloudPostgres = connectionString && /neon\.tech|sslmode=require|amazonaws\.com|supabase\.co/i.test(connectionString);

export const pool = new pg.Pool({
  connectionString,
  ssl: isCloudPostgres ? { rejectUnauthorized: false } : undefined
});

export async function query(text, params = []) {
  return pool.query(text, params);
}
