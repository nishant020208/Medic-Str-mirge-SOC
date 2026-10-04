/**
 * db-seed — (re)seed the catalogue, demo accounts and orders.
 *
 * Wipes products/users/orders/whitelist and re-inserts the seed data through
 * the attached adapter, so run this ONCE against an empty database (or when
 * deliberately resetting demo data) — it deletes registered users too.
 * This is the ONLY place the single pharmacist account is created.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

const { initDatabase, store } = await import('../server/src/data/store.js');

await initDatabase();

if (store.storageType !== 'postgres') {
  console.warn(
    '[db-seed] WARNING: no DATABASE_URL attached — seeding the in-memory store only.'
  );
} else {
  console.log('[db-seed] Seeding PostgreSQL ...');
}

await store.reset();

console.log(`[db-seed] OK — ${store.products.length} products, ${store.users.length} users, ${store.orders.length} orders.`);
console.log('[db-seed] Pharmacist account: pharmacist@medistore.test (created only here).');
process.exit(0);
