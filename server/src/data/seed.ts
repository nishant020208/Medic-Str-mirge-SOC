import { store } from './store.js';

console.log('--- Initiating Epidaurus Temple Seeding Ceremony ---');
store.reset();
console.log(`Seeded ${store.products.length} sacred medicinal formulations.`);
console.log(`Seeded ${store.users.length} initiate devotee accounts.`);
console.log(`Seeded ${store.orders.length} historical consignments.`);
console.log('Sanctum data initialized successfully.');
