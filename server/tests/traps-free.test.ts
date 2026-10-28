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
    { path: '/admin-old', expectedMarker: 'Asclepeion Admin Console', expectedType: 'text/html' },
    { path: '/.env', expectedMarker: 'DATABASE_URL', expectedType: 'text/plain' },
    { path: '/backup.zip', expectedMarker: 'PK', expectedType: 'application/zip' },
    { path: '/wp-login.php', expectedMarker: 'WordPress', expectedType: 'text/html' },
    { path: '/phpmyadmin', expectedMarker: 'phpMyAdmin', expectedType: 'text/html' },
    { path: '/api/v1/internal/keys', expectedMarker: 'key_live_oracle_priest_9021', expectedType: 'application/json' },
  ];

  for (const { path, expectedMarker, expectedType } of trapPaths) {
    it(`Path "${path}" returns convincing decoy and fails if SPA shell is returned`, async () => {
      const res = await fetch(`${baseUrl}${path}`);
      const text = await res.text();
      const contentType = res.headers.get('content-type') || '';

      // Must NOT be swallowed by client SPA fallback
      expect(text).not.toContain('<div id="root">');
      expect(text).not.toContain('Temple of Asclepius | Consecrated Ancient Pharmacopeia');
      expect(text).not.toContain('assets/index-');

      // Must return decoy response
      expect(res.status).toBe(200);
      expect(contentType).toContain(expectedType);
      expect(text).toContain(expectedMarker);
    });

    it(`Path "${path}" via x-forwarded-url header simulation returns decoy and never SPA shell`, async () => {
      const res = await fetch(`${baseUrl}/api`, {
        headers: {
          'x-forwarded-url': `https://asclepius-gamma.vercel.app${path}`,
        },
      });
      const text = await res.text();
      const contentType = res.headers.get('content-type') || '';

      expect(text).not.toContain('<div id="root">');
      expect(text).not.toContain('Temple of Asclepius | Consecrated Ancient Pharmacopeia');
      expect(res.status).toBe(200);
      expect(contentType).toContain(expectedType);
      expect(text).toContain(expectedMarker);
    });
  }

  it('Case-insensitive and trailing slash trap variants return decoy', async () => {
    const resSlash = await fetch(`${baseUrl}/admin-old/`);
    expect(resSlash.status).toBe(200);
    const textSlash = await resSlash.text();
    expect(textSlash).toContain('Asclepeion Admin Console');
    expect(textSlash).not.toContain('<div id="root">');

    const resUpper = await fetch(`${baseUrl}/ADMIN-OLD`);
    expect(resUpper.status).toBe(200);
    const textUpper = await resUpper.text();
    expect(textUpper).toContain('Asclepeion Admin Console');
    expect(textUpper).not.toContain('<div id="root">');
  });

  it('Legitimate client SPA route "/" returns 200 with HTML and SPA root', async () => {
    const res = await fetch(`${baseUrl}/`);
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';

    expect(res.status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<!DOCTYPE html>');
  });

  it('Legitimate client SPA route "/shop" returns 200 with HTML and SPA root', async () => {
    const res = await fetch(`${baseUrl}/shop`);
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';

    expect(res.status).toBe(200);
    expect(contentType).toContain('text/html');
    expect(text).toContain('<!DOCTYPE html>');
  });
});
