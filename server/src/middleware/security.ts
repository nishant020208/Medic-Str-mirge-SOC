import helmet from 'helmet';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';

export function configureHelmet() {
  const extraConnectSrc = process.env.CSP_CONNECT_EXTRA
    ? process.env.CSP_CONNECT_EXTRA.split(' ').filter(Boolean)
    : [];

  const mirageUrl = process.env.MIRAGE_URL ? process.env.MIRAGE_URL.replace(/\/+$/, '') : null;
  const terminalApiUrl = process.env.VITE_TERMINAL_API_URL
    ? new URL(process.env.VITE_TERMINAL_API_URL).origin
    : null;

  const dynamicConnectSrc = [
    "'self'",
    'https://mirage-soc.vercel.app',
    'https://rpc.sepolia.org',
    'https://*.infura.io',
    'https://*.alchemy.com',
    'https://generativelanguage.googleapis.com',
    ...(mirageUrl ? [mirageUrl] : []),
    ...(terminalApiUrl ? [terminalApiUrl] : []),
    ...extraConnectSrc,
  ];

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: Array.from(new Set(dynamicConnectSrc)),
        imgSrc: ["'self'", 'data:', 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: [
          "'self'",
          "'sha256-6/nvNoB4Ou7d8KfDwSJvWdJLQRerERILjwXhs8rGvGc='",
        ],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xFrameOptions: { action: 'deny' },
    crossOriginEmbedderPolicy: false,
  });
}

export { apiRateLimiter, loginRateLimiter } from './rateLimiter.js';

// Custom morgan logger including real client IP (req.ip)
morgan.token('client-ip', (req: Request) => req.ip || req.socket.remoteAddress || '-');
export const morganLogger = morgan(
  ':client-ip - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'
);

/**
 * Robust CSRF Protection middleware for state-changing HTTP methods.
 *
 * Enforces:
 * 1. Sec-Fetch-Site: blocks any request marked cross-site.
 * 2. Strict Origin/Host verification against the app host.
 * 3. Double-submit / Custom Header token verification (X-CSRF-Token or X-Requested-With).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt only the exact decoy login form paths
  const decoyFormPaths = [
    '/admin-old/auth',
    '/wp-login.php',
    '/phpmyadmin/index.php',
    '/phpmyadmin',
  ];
  const normalizedPath =
    (req.path || req.url || '').toLowerCase().replace(/\/+$/, '') || '/';
  if (req.method === 'POST' && decoyFormPaths.includes(normalizedPath)) {
    return next();
  }

  // 1. Strict Sec-Fetch-Site check (blocks browser-initiated cross-site form/fetch attacks)
  const secFetchSite = req.headers['sec-fetch-site'];
  if (secFetchSite === 'cross-site') {
    return res.status(403).json({
      error: 'Cross-site request forgery prevented by Sec-Fetch-Site policy.',
    });
  }

  // 2. Strict Origin / Host verification
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return res.status(403).json({
          error: 'Cross-origin sanctuary intrusion prevented. CSRF precaution triggered.',
        });
      }
    } catch {
      return res.status(403).json({ error: 'Malformed Origin header' });
    }
  }

  // 3. Double-submit / Anti-CSRF Token verification
  const csrfHeaderToken = req.headers['x-csrf-token'];
  const sessionCsrfToken = (req.session as any)?.csrfToken;
  const cookieCsrfToken = (req as any).cookies?.['csrf-token'];

  // If a double-submit token is expected or sent, verify exact match
  if (csrfHeaderToken) {
    const expected = sessionCsrfToken || cookieCsrfToken;
    if (expected && csrfHeaderToken !== expected) {
      return res.status(403).json({
        error: 'Mismatched CSRF token. Request denied.',
      });
    }
    return next();
  }

  // Otherwise, require custom anti-CSRF token / header
  const customHeader = req.headers['x-requested-with'];
  if (!customHeader) {
    return res.status(403).json({
      error: 'Missing required sanctum authorization token (X-CSRF-Token or X-Requested-With). CSRF precaution triggered.',
    });
  }

  next();
}
