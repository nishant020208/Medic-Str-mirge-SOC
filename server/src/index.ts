import http from 'http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initDatabaseInBackground } from './data/store.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const server = http.createServer(app);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  initDatabaseInBackground().catch((err) => {
    console.warn('[Database] Initialization notice:', err.message);
  });

  server.listen(Number(PORT), HOST, () => {
    console.log(`[MediStore] Temple of Asclepius server listening on http://${HOST}:${PORT}`);
    console.log(`[MediStore] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[MediStore] MirageSOC security pass-through initialized as first middleware`);
  });
}

export { app, server };
export default app;
