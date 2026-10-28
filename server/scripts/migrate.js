import 'dotenv/config';
import { pool } from '../src/db.js';
import { runMigrations } from '../src/migrations.js';
try {
  await runMigrations();
  console.log('Database schema is up to date.');
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
