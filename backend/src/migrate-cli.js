import { runMigrations } from './migrations.js';
import { pool } from './db.js';

try {
  await runMigrations();
  console.log('Database migrations are up to date.');
} finally {
  await pool.end();
}
