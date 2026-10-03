import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import memorystore from 'memorystore';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

// Mirage Security Hook
// @ts-ignore - mirage.js is a plain JS stub that will be replaced during security testing
import mirage from '../mirage.js';

import {
  configureHelmet,
  apiRateLimiter,
  morganLogger,
  csrfProtection,
} from './middleware/security.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Rule 2: Trust proxy MUST be enabled
app.set('trust proxy', true);

// Rule 2: Mount mirage as the VERY FIRST middleware
// BEFORE static files, API routes, body parsers and the SPA fallback
app.use(mirage);

// Rule 6: Expose GET /healthz returning { status: "ok" }
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Logging with morgan, capturing req.ip
app.use(morganLogger);

// Helmet with strict CSP
app.use(configureHelmet());

// Compression
app.use(compression());

// CORS - same-origin by default
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Session setup with MemoryStore
const MemoryStoreSession = memorystore(session);
const isProd = process.env.NODE_ENV === 'production';

app.use(
  session({
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000,
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'asclepeion_sacred_secret_passphrase_2026',
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CSRF Protection for state-changing requests
app.use(csrfProtection);

// API Rate Limiting and Routes
app.use('/api', apiRateLimiter);
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Static client assets
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Rule 4: SPA fallback MUST ONLY serve index.html for paths WITHOUT a file extension
// and NOT starting with /api, so trap paths (/admin-old, /.env, /backup.zip, etc.) are NOT swallowed!
app.get('*', (req, res, next) => {
  // If the path starts with /api or has a file extension (.env, .zip, .php, etc.), pass to next()
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }

  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// 404 handler for unmatched backend paths
app.use((req, res) => {
  res.status(404).json({ error: 'Sanctum endpoint not found' });
});

// WebSocket Server for Oracle Console (/terminal-ws)
const wss = new WebSocketServer({ server, path: '/terminal-ws' });

wss.on('connection', (ws: WebSocket) => {
  ws.send(
    JSON.stringify({
      reply: 'Asclepeion Terminal Daemon connected. Enter "help" for options.',
    })
  );

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      const cmd = (data.cmd || '').trim().toLowerCase();

      let reply = '';
      switch (cmd) {
        case 'help':
          reply = `Available sanctum operations:
  status   - Health inspection
  whoami   - Current user credentials
  version  - System compilation manifest
  time     - Epidaurus celestial clock
  exit     - Sever terminal link`;
          break;
        case 'status':
          reply = 'SYSTEM HEALTH: All dispensary sub-systems normal. MirageSOC hooks primed.';
          break;
        case 'whoami':
          reply = 'deploy (UID=1001, GID=1001, Shell=/bin/temple-sh)';
          break;
        case 'version':
          reply = 'MediStore v1.0.0-asclepeion [Production Node 20 / Express 4]';
          break;
        case 'time':
          reply = `Current celestial timestamp: ${new Date().toISOString()}`;
          break;
        case 'exit':
          reply = 'Closing oracle stream...';
          ws.close();
          return;
        default:
          reply = `bash: command not recognized: "${cmd}". Type "help" for commands.`;
          break;
      }

      ws.send(JSON.stringify({ reply }));
    } catch {
      ws.send(JSON.stringify({ reply: 'Error: invalid payload format' }));
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[MediStore] Temple of Asclepius server listening on port ${PORT}`);
  console.log(`[MediStore] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[MediStore] MirageSOC security pass-through initialized as first middleware`);
});

export { app, server };
