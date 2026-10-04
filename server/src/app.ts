import express from 'express';
import path from 'path';
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
import { whenStoreReady } from './data/store.js';
import { getPostgresPool, checkDatabaseHealth } from './data/db.js';

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

// Expose GET /healthz returning { status: "ok", db: "ok" | "down" }
app.get('/healthz', async (req, res) => {
  const dbStatus = await checkDatabaseHealth();
  res.status(200).json({ status: 'ok', db: dbStatus });
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

// Stateless Session setup: connect-pg-simple on Neon Postgres, fallback to MemoryStore
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

// Express must not serve static files on Vercel (Vercel CDN serves client/dist).
// Keep static serving only for local production preview.
if (!process.env.VERCEL) {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(
    express.static(clientDistPath, {
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
}

// 404 handler for unmatched backend paths, trap paths, and unknown assets
// Every one must return 404 (plain "Not found", NOT index.html, NOT the React app)
app.use((req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

export { app };
export default app;
