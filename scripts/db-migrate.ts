/**
 * db-migrate — ensure the Supabase Postgres schema exists.
 *
 * Loads the root .env.local (the single local secrets file), connects with the
 * pooled DATABASE_URL and runs CREATE TABLE IF NOT EXISTS for every table via
 * PostgresAdapter.initialize(). Never wipes data — seeding is `npm run db:seed`.
 * initialize() also seeds the catalogue / demo accounts on an EMPTY database.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
// process env wins over the file, so a shell-exported DATABASE_URL still works
dotenv.config({ path: path.join(root, '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error(
    '[db:migrate] DATABASE_URL is not set. Add the Supabase session-pooler connection string to .env.local (or export it in the shell).'
  );
  process.exit(1);
}

const host = process.env.DATABASE_URL.replace(/.*@([^/?]+).*/, '$1');
console.log(`[db:migrate] Connecting to ${host} ...`);

const { initDatabase, store } = await import('../server/src/data/store.js');
const { getPostgresPool } = await import('../server/src/data/db.js');

await initDatabase();

if (store.storageType !== 'postgres') {
  console.error(
    '[db:migrate] FAILED: the PostgreSQL adapter did not attach (see warnings above). No schema was created.'
  );
  process.exit(1);
}

const pool = getPostgresPool();
if (!pool) {
  console.error('[db:migrate] FAILED: no connection pool.');
  process.exit(1);
}

const res = await pool.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1"
);
console.log('[db:migrate] OK — tables in schema public:');
for (const row of res.rows) {
  console.log('  -', row.tablename);
}
await pool.end();
process.exit(0);
