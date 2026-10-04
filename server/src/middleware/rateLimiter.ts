import { Request, Response, NextFunction } from 'express';
import { getPostgresPool } from '../data/db.js';

// In-memory fallback map for offline / test environments
const fallbackLimits = new Map<string, { count: number; resetAt: number }>();

export function resetFallbackRateLimits() {
  fallbackLimits.clear();
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; count: number; resetAt: Date }> {
  const pool = getPostgresPool();
  const now = Date.now();
  const windowEnd = new Date(now + windowMs);

  if (pool) {
    try {
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
        RETURNING count, reset_at;
      `;
      const res = await pool.query(query, [key, windowEnd]);
      const row = res.rows[0];
      const count = parseInt(row.count, 10);
      const resetAt = new Date(row.reset_at);
      return { allowed: count <= max, count, resetAt };
    } catch (err: any) {
      console.warn('[RateLimiter] Database pool error, falling back to memory store:', err.message);
    }
  }

  // In-memory fallback (when running without PostgreSQL or during unit tests)
  const existing = fallbackLimits.get(key);
  if (!existing || now >= existing.resetAt) {
    const entry = { count: 1, resetAt: now + windowMs };
    fallbackLimits.set(key, entry);
    return { allowed: true, count: 1, resetAt: new Date(entry.resetAt) };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= max,
    count: existing.count,
    resetAt: new Date(existing.resetAt),
  };
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  prefix: string;
  message: string;
  keyGenerator?: (req: Request) => string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : `${options.prefix}:${rawIp}`;

    try {
      const result = await checkRateLimit(key, options.max, options.windowMs);
      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - result.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt.getTime() / 1000));

      if (!result.allowed) {
        return res.status(429).json({ error: options.message });
      }
      next();
    } catch {
      next();
    }
  };
}

// 1. Login rate limit: 10 per minute per IP (11th attempt returns 429)
export const loginRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: 'rl:login',
  message: 'Too many unauthorized entry attempts. Sanctum veil locked for 60 seconds.',
});

// 2. API rate limit: 120 per minute per IP
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  prefix: 'rl:api',
  message: 'Too many sanctum inquiries. Please await the next celestial minute.',
});

// 3. Oracle rate limit: 10 per minute per IP
export const oracleIpLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  prefix: 'rl:oracle:ip',
  message: 'The Oracle requires celestial rest. Maximum 10 petitions per minute.',
});

// 4. Oracle rate limit: 40 per hour per session
export const oracleSessionLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 40,
  prefix: 'rl:oracle:session',
  keyGenerator: (req: Request) => {
    const sessionId = (req.session as any)?.id || req.sessionID || req.ip || 'anon_seeker';
    return `rl:oracle:session:${sessionId}`;
  },
  message: 'Your mortal quota of 40 Oracle inquiries this hour is exhausted. Seek further revelation tomorrow.',
});
