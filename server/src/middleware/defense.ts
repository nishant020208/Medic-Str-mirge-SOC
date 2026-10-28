import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createRequire } from 'module';
import { getPostgresPool } from '../data/db.js';
// @ts-ignore - mirage.js is a plain JS module
import mirage from '../../mirage.js';

const require = createRequire(import.meta.url);

let routesManifest: any;
try {
  routesManifest = require('../../generated/routes.json');
} catch {
  try {
    routesManifest = require('../generated/routes.json');
  } catch {
    routesManifest = { staticRoutes: ['/'], dynamicRoutes: [] };
  }
}

/**
 * Serverless-safe counter using the existing PostgreSQL rate_limits table.
 * If the database is unavailable or throws, fails open silently and returns null.
 */
export async function checkRateLimitCounter(
  key: string,
  threshold: number,
  windowMs: number
): Promise<{ reachedThreshold: boolean; count: number } | null> {
  const pool = getPostgresPool();
  if (!pool) {
    return null; // DB unavailable -> fail open silently
  }

  try {
    const windowEnd = new Date(Date.now() + windowMs);
    const query = `
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES ($1, 1, $2)
      ON CONFLICT (key) DO UPDATE
      SET count = CASE
        WHEN rate_limits.reset_at <= NOW() THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= NOW() THEN $2
        ELSE rate_limits.reset_at
      END
      RETURNING count;
    `;
    const res = await pool.query(query, [key, windowEnd]);
    if (!res.rows || res.rows.length === 0) return null;

    const count = parseInt(res.rows[0].count, 10);
    // Emits once per window when the count exactly reaches the threshold
    return { reachedThreshold: count === threshold, count };
  } catch (err: any) {
    console.warn('[Defense] DB rate limit query error:', err?.message || err);
    return null;
  }
}

// Statically compiled client routes derived at build time from client/src/App.tsx
const staticRoutes = new Set<string>(
  (routesManifest?.staticRoutes || []).map((r: string) => r.toLowerCase().replace(/\/+$/, '') || '/')
);

const dynamicPatterns: RegExp[] = (routesManifest?.dynamicRoutes || []).map(
  (d: { pattern: string }) => new RegExp(d.pattern)
);

/**
 * Returns known routes derived at build time from the client router.
 */
export function getDerivedClientRoutes(): {
  staticRoutes: Set<string>;
  dynamicPatterns: RegExp[];
} {
  return { staticRoutes, dynamicPatterns };
}

/**
 * Checks whether the given path matches any known client route.
 */
export function isKnownClientRoute(urlPath: string): boolean {
  if (!urlPath) return false;
  const normalized = urlPath.toLowerCase().replace(/\/+$/, '') || '/';

  if (staticRoutes.has(normalized)) return true;
  for (const re of dynamicPatterns) {
    if (re.test(normalized)) return true;
  }
  return false;
}

/**
 * An unknown path is probed if:
 * 1. Matches no pattern in client route manifest
 * 2. Not /api/*
 * 3. Not /assets/*
 * 4. Not a static file (no file extension, not common asset file)
 * 5. Not a reserved trap path
 */
export function isUnknownPath(urlPath: string): boolean {
  if (!urlPath) return false;
  const normalized = urlPath.toLowerCase().replace(/\/+$/, '') || '/';

  // 1. Trap path -> false (handled by mirage trap logic)
  if (typeof mirage.isReservedTrapPath === 'function' ? mirage.isReservedTrapPath(normalized) : false) {
    return false;
  }

  // 2. Not /api/*
  if (normalized.startsWith('/api')) {
    return false;
  }

  // 3. Not /assets/*
  if (normalized.startsWith('/assets')) {
    return false;
  }

  // 4. Not static files (has extension or common static root file)
  if (
    path.extname(normalized) !== '' ||
    normalized.includes('.') ||
    normalized === '/favicon.ico' ||
    normalized === '/robots.txt' ||
    normalized === '/manifest.json' ||
    normalized === '/site.webmanifest'
  ) {
    return false;
  }

  // 5. Matches known client routes pattern
  if (isKnownClientRoute(normalized)) {
    return false;
  }

  return true;
}

/**
 * Serverless-safe flood detector:
 * more than 25 requests in 5s per IP via PostgreSQL rate_limits table.
 * Emits once per window. If DB is down, skips silently (fail open).
 */
export async function floodMiddleware(req: Request, _res: Response, next: NextFunction) {
  const ip = typeof mirage.getClientIp === 'function' ? mirage.getClientIp(req) : (req.ip || '');
  if (!ip) return next();

  try {
    const result = await checkRateLimitCounter(`flood:${ip}`, 26, 5000);
    if (result?.reachedThreshold) {
      await mirage.sendEvent({
        ip,
        userAgent: req.headers['user-agent'] || '',
        method: req.method,
        path: req.path || req.url || '/',
        kind: 'flood',
        detail: {
          reason: 'request_flood_rate_exceeded',
          threshold: 25,
          windowSeconds: 5,
        },
        severity: 'high',
      });
    }
  } catch (err: any) {
    console.warn('[FloodMiddleware] Error:', err?.message || err);
  }

  next();
}

/**
 * Serverless-safe enumeration detector:
 * unknown non-extension paths (SPA still served, routes derived from client router),
 * 10 or more in 60s per IP via PostgreSQL rate_limits table.
 * Emits once per window. If DB is down, skips silently (fail open).
 */
export async function checkSpaEnumeration(req: Request) {
  const ip = typeof mirage.getClientIp === 'function' ? mirage.getClientIp(req) : (req.ip || '');
  if (!ip) return;

  const reqPath = req.path || req.url || '/';

  try {
    const result = await checkRateLimitCounter(`enum:${ip}`, 10, 60000);
    if (result?.reachedThreshold) {
      await mirage.sendEvent({
        ip,
        userAgent: req.headers['user-agent'] || '',
        method: req.method,
        path: reqPath,
        kind: 'enumeration',
        detail: {
          path: reqPath,
          reason: 'spa_non_extension_probing_threshold_reached',
          threshold: 10,
          windowSeconds: 60,
        },
        severity: 'medium',
      });
    }
  } catch (err: any) {
    console.warn('[CheckSpaEnumeration] Error:', err?.message || err);
  }
}
