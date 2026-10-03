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
import { initDatabase } from './data/store.js';

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

// Logging with morgan, capturing req.ip
app.use(morganLogger);

// Helmet with strict CSP
app.use(configureHelmet());

// Rule 6: Expose GET /healthz returning { status: "ok" }
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

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

// Explicit reserved trap paths for MirageSOC security triggers
export const RESERVED_TRAP_PATHS = [
  '/admin-old',
  '/.env',
  '/backup.zip',
  '/wp-login.php',
  '/phpmyadmin',
  '/api/v1/internal/keys',
];

export function isReservedTrapPath(urlPath: string): boolean {
  const normalized = urlPath.toLowerCase().replace(/\/+$/, '') || '/';
  return RESERVED_TRAP_PATHS.some((trap) => trap.toLowerCase() === normalized);
}

// Static client assets with long-term caching for hashed assets
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(
  express.static(clientDistPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Never long-cache HTML or manifest
      if (filePath.endsWith('.html') || filePath.endsWith('manifest.json')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Rule 4: SPA fallback MUST ONLY serve index.html for GET requests that:
// 1. Have no file extension
// 2. Do not start with /api
// 3. Are not in the explicit reserved-paths list (the six trap paths above, case-insensitive, with or without trailing slash)
app.get('*', (req, res, next) => {
  // Only handle GET and HEAD requests
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  // Must not start with /api
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Must not have a file extension
  if (path.extname(req.path) !== '' || (req.path.slice(1).includes('.') && !req.path.endsWith('/'))) {
    return next();
  }

  // Must not be a reserved trap path (case-insensitive, with or without trailing slash)
  if (isReservedTrapPath(req.path)) {
    return next();
  }

  const indexPath = path.join(clientDistPath, 'index.html');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next();
    }
  });
});

// 404 handler for unmatched backend paths, trap paths, and unknown assets
// Every one must return 404 (plain "Not found", NOT index.html, NOT the React app)
app.use((req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

// WebSocket Server for Oracle Console (/terminal-ws)
// OFF by default. Enabled ONLY when ENABLE_LOCAL_TERMINAL_ECHO=true.
// When on, it may only return harmless canned text (e.g. "command not found: <first word>"), max 200 chars input, never executes anything.
// MirageSOC will replace this endpoint via VITE_TERMINAL_WS_URL.
let wss: WebSocketServer | null = null;
if (process.env.ENABLE_LOCAL_TERMINAL_ECHO === 'true') {
  wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    ws.send(
      JSON.stringify({
        reply: 'Asclepeion Terminal Local Echo connected (canned echo mode).',
      })
    );

    ws.on('message', (message: string) => {
      try {
        const rawStr = message.toString();
        // Max 200 chars input
        if (rawStr.length > 200) {
          ws.send(JSON.stringify({ reply: 'Error: input exceeds maximum limit of 200 characters.' }));
          return;
        }

        let cmd = '';
        try {
          const parsed = JSON.parse(rawStr);
          cmd = String(parsed.cmd || parsed.command || '').trim();
        } catch {
          cmd = rawStr.trim();
        }

        if (cmd.length > 200) {
          ws.send(JSON.stringify({ reply: 'Error: command exceeds 200 characters.' }));
          return;
        }

        const firstWord = cmd.split(/\s+/)[0] || '';
        // Harmless canned response only - never executes anything
        const reply = `command not found: ${firstWord}`;
        ws.send(JSON.stringify({ reply }));
      } catch {
        ws.send(JSON.stringify({ reply: 'Error: invalid payload format' }));
      }
    });
  });
}

// Safely handle HTTP upgrade requests
server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host || 'localhost';
  const pathname = request.url ? new URL(request.url, `http://${host}`).pathname : '';
  if (pathname === '/terminal-ws') {
    if (process.env.ENABLE_LOCAL_TERMINAL_ECHO === 'true' && wss) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
    }
  }
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  initDatabase().catch((err) => {
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
