import pg from 'pg';

const { Pool } = pg;
const schema = process.env.PGSCHEMA || 'public';
if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid PGSCHEMA');
// A stay is a calendar date, not a timestamp in the server's local timezone.
pg.types.setTypeParser(1082, value => value);
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
  options: `-c timezone=UTC -c search_path=${schema}`
});
pool.on('error', () => console.error('An idle PostgreSQL connection failed'));

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
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
