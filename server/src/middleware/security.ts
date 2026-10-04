import helmet from 'helmet';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';

export function configureHelmet() {
  const extraConnectSrc = process.env.CSP_CONNECT_EXTRA
    ? process.env.CSP_CONNECT_EXTRA.split(' ')
    : [];

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          'https://*.infura.io',
          'https://*.alchemy.com',
          'https://rpc.sepolia.org',
          ...extraConnectSrc,
        ],
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
    crossOriginEmbedderPolicy: false,
  });
}

export { apiRateLimiter, loginRateLimiter } from './rateLimiter.js';

// Custom morgan logger including real client IP (req.ip)
morgan.token('client-ip', (req: Request) => req.ip || req.socket.remoteAddress || '-');
export const morganLogger = morgan(
  ':client-ip - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms'
);

// CSRF Protection middleware for state-changing HTTP methods
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Verify custom header commonly used by AJAX/SPA clients
  const customHeader = req.headers['x-requested-with'];
  if (!customHeader) {
    return res.status(403).json({
      error: 'Missing required sanctum authorization header (X-Requested-With). CSRF precaution triggered.',
    });
  }

  // Verify origin if present
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

  next();
}
