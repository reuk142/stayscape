import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transaction } from './db.js';

export async function runMigrations() {
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
  const files = (await readdir(directory)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  const migrations = await Promise.all(files.map(async name => ({ name, sql: await readFile(path.join(directory, name), 'utf8') })));
  await transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['stayscape_schema_migrations']);
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const {name, sql} of migrations) {
      const exists = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
      if (exists.rowCount) continue;
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
      console.log('Applied ' + name);
    }
  });
}
