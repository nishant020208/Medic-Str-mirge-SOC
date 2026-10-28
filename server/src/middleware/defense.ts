import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getPostgresPool } from '../data/db.js';
// @ts-ignore - mirage.js is a plain JS module
import mirage from '../../mirage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  } catch {
    // DB error -> fail open silently
    return null;
  }
}

let cachedClientRoutes: { staticRoutes: Set<string>; dynamicPatterns: RegExp[] } | null = null;

/**
 * Derives known client routes dynamically from the React client router (client/src/App.tsx).
 * Not hardcoded.
 */
export function getDerivedClientRoutes(): {
  staticRoutes: Set<string>;
  dynamicPatterns: RegExp[];
} {
  if (cachedClientRoutes) return cachedClientRoutes;

  const staticRoutes = new Set<string>(['/']);
  const dynamicPatterns: RegExp[] = [];

  const candidates = [
    path.resolve(process.cwd(), 'client/src/App.tsx'),
    path.resolve(__dirname, '../../../client/src/App.tsx'),
    path.resolve(__dirname, '../../client/src/App.tsx'),
    path.resolve('/var/task/client/src/App.tsx'),
  ];

  let appContent = '';
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        appContent = fs.readFileSync(c, 'utf-8');
        break;
      } catch {
        // continue
      }
    }
  }

  if (appContent) {
    for (const match of appContent.matchAll(/<Route\s+([^>]+)>/g)) {
      const pathMatch = match[1].match(/path=[\x22\x27]([^\x22\x27]+)[\x22\x27]/);
      if (pathMatch) {
        const raw = pathMatch[1].trim();
        if (raw === '*') continue;
        const normalized = '/' + raw.replace(/^\//, '').replace(/\/+$/, '');
        if (normalized.includes(':')) {
          const regexStr = '^' + normalized.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
          dynamicPatterns.push(new RegExp(regexStr));
        } else {
          staticRoutes.add(normalized);
        }
      } else if (match[1].includes('index')) {
        staticRoutes.add('/');
      }
    }
  }

  cachedClientRoutes = { staticRoutes, dynamicPatterns };
  return cachedClientRoutes;
}

export function isKnownClientRoute(urlPath: string): boolean {
  const normalized = (urlPath || '').toLowerCase().replace(/\/+$/, '') || '/';
  const { staticRoutes, dynamicPatterns } = getDerivedClientRoutes();

  if (staticRoutes.has(normalized)) return true;
  for (const re of dynamicPatterns) {
    if (re.test(normalized)) return true;
  }
  return false;
}

/**
 * Serverless-safe flood detector:
 * more than 25 requests in 5s per IP via PostgreSQL rate_limits table.
 * Emits once per window. If DB is down, skips silently (fail open).
 */
export function floodMiddleware(req: Request, _res: Response, next: NextFunction) {
  const ip = typeof mirage.getClientIp === 'function' ? mirage.getClientIp(req) : (req.ip || '');
  if (!ip) return next();

  // Non-blocking asynchronous increment in Postgres rate_limits
  checkRateLimitCounter(`flood:${ip}`, 26, 5000)
    .then((result) => {
      if (result?.reachedThreshold) {
        mirage.sendEvent({
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
    })
    .catch(() => {});

  next();
}

/**
 * Serverless-safe enumeration detector:
 * unknown non-extension paths (SPA still served, routes derived from client router),
 * 10 or more in 60s per IP via PostgreSQL rate_limits table.
 * Emits once per window. If DB is down, skips silently (fail open).
 */
export function checkSpaEnumeration(req: Request) {
  const ip = typeof mirage.getClientIp === 'function' ? mirage.getClientIp(req) : (req.ip || '');
  if (!ip) return;

  const reqPath = req.path || req.url || '/';

  checkRateLimitCounter(`enum:${ip}`, 10, 60000)
    .then((result) => {
      if (result?.reachedThreshold) {
        mirage.sendEvent({
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
    })
    .catch(() => {});
}
