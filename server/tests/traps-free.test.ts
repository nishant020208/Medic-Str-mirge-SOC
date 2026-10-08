import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../src/index.js';
import { AddressInfo } from 'net';

let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    if (server.listening) {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    } else {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    }
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Trap Paths Must Be Free & Unswallowed by SPA Fallback', () => {
  const trapPaths = [
    '/admin-old',
    '/.env',
    '/backup.zip',
    '/wp-login.php',
    '/phpmyadmin',
    '/api/v1/internal/keys',
    '/admin-old/',
    '/ADMIN-OLD',
  ];

  for (const path of trapPaths) {
    it(`Path "${path}" returns convincing decoy and is never swallowed by SPA`, async () => {
      const res = await fetch(`${baseUrl}${path}`);
      const text = await res.text();

      expect(res.status).toBe(200);
      expect(text).not.toContain('<div id="root">');
      expect(text).not.toContain('React');
    });
  }

  it('Legitimate client SPA route "/" returns 200 with HTML', async () => {
    const res = await fetch(`${baseUrl}/`);
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';

    expect(res.status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<!DOCTYPE html>');
  });

  it('Legitimate client SPA route "/shop" returns 200 with HTML', async () => {
    const res = await fetch(`${baseUrl}/shop`);
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';

    expect(res.status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<!DOCTYPE html>');
  });
});
