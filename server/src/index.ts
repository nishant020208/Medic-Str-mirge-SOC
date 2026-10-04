import http from 'http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initDatabaseInBackground } from './data/store.js';

dotenv.config();

// A non-positive or malformed PORT in the ambient shell (e.g. PORT=0 exported
// by a dev tool) would silently bind a random ephemeral port and break every
// health check — treat it as unset and fall back to 5000.
const parsedPort = Number(process.env.PORT);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 5000;
const HOST = '0.0.0.0';

const server = http.createServer(app);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  initDatabaseInBackground().catch((err) => {
    console.warn('[Database] Initialization notice:', err.message);
  });    server.listen(PORT, HOST, () => {
    console.log(`[MediStore] Temple of Asclepius server listening on http://${HOST}:${PORT}`);
    console.log(`[MediStore] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[MediStore] MirageSOC security pass-through initialized as first middleware`);
  });
}

export { app, server };
export default app;
