import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db.js';
import { runMigrations } from './migrations.js';
const secret = process.env.JWT_SECRET || '';
if (secret.length < 32 || /REPLACE_|replace-with/i.test(secret)) {
  console.error('Set a private JWT_SECRET of at least 32 characters in server/.env');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !(process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL)) {
  console.error('Set APP_ORIGIN or deploy on a platform that provides RENDER_EXTERNAL_URL');
  process.exit(1);
}
try {
  await runMigrations();
  const server = app.listen(process.env.PORT || 5000, () => console.log('StayScape API listening on port ' + (process.env.PORT || 5000)));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    const timer = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => { await pool.end(); clearTimeout(timer); process.exit(0); });
  });
} catch {
  console.error('PostgreSQL startup failed. Check DATABASE_URL or PG* settings and run npm run migrate.');
  await pool.end();
  process.exitCode = 1;
}
