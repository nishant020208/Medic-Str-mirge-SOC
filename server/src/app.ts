import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import memorystore from 'memorystore';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';

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
import { oracleRouter } from './routes/oracle.js';
import { terminalRouter } from './routes/terminal.js';
import { whenStoreReady } from './data/store.js';
import { getPostgresPool, checkDatabaseHealth } from './data/db.js';
import { checkSupabaseHealth } from './lib/supabaseAdmin.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

// Rule 2: Trust proxy MUST be enabled for Vercel and reverse proxies
app.set('trust proxy', true);

// Rule 2: Mount mirage as the VERY FIRST middleware
// BEFORE static files, API routes, body parsers and the SPA fallback
app.use(mirage);

// Logging with morgan, capturing req.ip
app.use(morganLogger);

// Helmet with strict CSP
app.use(configureHelmet());

// Expose GET /healthz returning { status: "ok", db: "ok" | "down", supabase: "ok" | "down" }
app.get('/healthz', async (req, res) => {
  const [dbStatus, supabaseStatus] = await Promise.all([
    checkDatabaseHealth(),
    checkSupabaseHealth(),
  ]);
  res.status(200).json({ status: 'ok', db: dbStatus, supabase: supabaseStatus });
});

// Compression
app.use(compression());

// CORS - explicit allowlist (no wildcard with credentials)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
  process.env.APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (incomingOrigin, callback) => {
      // Allow non-browser requests or same-origin without Origin header
      if (!incomingOrigin) return callback(null, true);
      if (
        allowedOrigins.includes(incomingOrigin) ||
        /^https:\/\/.*\.vercel\.app$/.test(incomingOrigin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Stateless Session setup: connect-pg-simple on the Supabase session pooler, fallback to MemoryStore
const PgStore = pgSession(session);
const MemoryStore = memorystore(session);

const pool = getPostgresPool();
const sessionStore = pool
  ? new PgStore({
      pool,
      tableName: 'session',
      createTableIfMissing: false,
    })
  : new MemoryStore({
      checkPeriod: 86400000,
    });

if (sessionStore && typeof (sessionStore as any).on === 'function') {
  (sessionStore as any).on('error', (err: any) => {
    console.warn('[Session] Session store notice:', err.message);
  });
}

const isProd = process.env.NODE_ENV === 'production';

app.use(
  session({
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
    },
    store: sessionStore,
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

// API Cache headers: no-store for /api/*
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

// API Rate Limiting and Routes
app.use('/api', apiRateLimiter);

// Gate API requests until the database adapter is ready
app.use('/api', async (_req, _res, next) => {
  try {
    await whenStoreReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/oracle', oracleRouter);
app.use('/api/terminal', terminalRouter);

function getClientDistPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../client/dist'),
    path.resolve('/var/task/client/dist'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const resolvedDistPath = getClientDistPath();

// Static assets serving (active locally and as serverless fallback)
if (resolvedDistPath) {
  app.use(
    express.static(resolvedDistPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
}

// SPA fallback ONLY for GET/HEAD requests without extension, not /api, not reserved trap paths
app.get('*', (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  if (req.path.startsWith('/api')) {
    return next();
  }

  if (path.extname(req.path) !== '' || (req.path.slice(1).includes('.') && !req.path.endsWith('/'))) {
    return next();
  }

  let checkPath = req.path;
  const forwardedUrl = req.headers?.['x-forwarded-url'] || req.headers?.['x-original-url'];
  if (typeof forwardedUrl === 'string' && forwardedUrl.trim()) {
    try {
      const parsed = new URL(forwardedUrl, 'http://localhost');
      if (parsed.pathname) checkPath = parsed.pathname;
    } catch {
      // ignore
    }
  }

  if (isReservedTrapPath(checkPath)) {
    return next();
  }

  const distPath = getClientDistPath();
  if (distPath) {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.sendFile(indexPath, (err) => {
        if (err) {
          next();
        }
      });
    }
  }
  next();
});

// 404 handler for unmatched backend paths, trap paths, and unknown assets
// Every one must return 404 (plain "Not found", NOT index.html, NOT the React app)
app.use((req, res) => {
  if (typeof (mirage as any).reportEnumeration === 'function') {
    (mirage as any).reportEnumeration(req);
  }
  res.status(404).type('text/plain').send('Not found');
});

export { app };
export default app;
