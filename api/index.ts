import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/src/app.js';
import { initDatabaseInBackground } from '../server/src/data/store.js';

// Trigger non-blocking database initialization on Vercel cold starts
initDatabaseInBackground().catch((err: any) => {
  console.warn('[Vercel Serverless] DB init notice:', err?.message || err);
});

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // If Vercel rewrote the URL, x-forwarded-url contains the original client requested path
  const forwarded = req.headers['x-forwarded-url'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    try {
      const parsed = new URL(forwarded, 'http://localhost');
      req.url = parsed.pathname + parsed.search;
    } catch {
      // ignore
    }
  }
  return (app as any)(req, res);
}
