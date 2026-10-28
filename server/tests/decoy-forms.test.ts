import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/app.js';
// @ts-ignore
import { resetBlocklistCache } from '../mirage.js';

describe('Decoy HTML Login Forms (/admin-old/auth, /wp-login.php, /phpmyadmin/index.php)', () => {
  let mockSocServer: http.Server;
  let mockSocUrl: string;
  let testAppServer: http.Server;
  let testAppUrl: string;

  interface ReceivedEvent {
    headers: http.IncomingHttpHeaders;
    body: any;
  }

  let capturedEvents: ReceivedEvent[] = [];

  beforeAll(async () => {
    // 1. Mock MirageSOC backend
    mockSocServer = http.createServer(async (req, res) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        const url = req.url || '';
        if (url.startsWith('/api/blocklist')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ips: [], fingerprints: [], ttl: 3 }));
        } else if (url.startsWith('/api/event')) {
          let body = null;
          try {
            body = JSON.parse(data);
          } catch {
            body = data;
          }
          capturedEvents.push({ headers: req.headers, body });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
    });

    await new Promise<void>((resolve) => {
      mockSocServer.listen(0, '127.0.0.1', () => {
        const addr = mockSocServer.address() as AddressInfo;
        mockSocUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    testAppServer = http.createServer(app);
    await new Promise<void>((resolve) => {
      testAppServer.listen(0, '127.0.0.1', () => {
        const addr = testAppServer.address() as AddressInfo;
        testAppUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve) => mockSocServer?.close(() => resolve())),
      new Promise<void>((resolve) => testAppServer?.close(() => resolve())),
    ]);
  });

  beforeEach(() => {
    capturedEvents = [];
    resetBlocklistCache();
    process.env.MIRAGE_URL = mockSocUrl;
    process.env.MIRAGE_API_KEY = 'test_mirage_api_key_valid';
    process.env.MIRAGE_MODE = 'enforce';
  });

  it('1. POST /admin-old/auth is exempt from CSRF, emits decoy_login, returns realistic failure', async () => {
    const res = await fetch(`${testAppUrl}/admin-old/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-vercel-forwarded-for': '198.51.100.111',
      },
      body: new URLSearchParams({ user: 'archon_intruder', key: 'random_bad_key_123' }).toString(),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Sanctuary Verification Refused');
    expect(html).toContain('Master Devotional Key rejected');
    expect(html).not.toContain('<div id="root"></div>'); // NOT SPA fallback

    await new Promise((r) => setTimeout(r, 80));
    const evt = capturedEvents.find((e) => e.body?.path === '/admin-old/auth');
    expect(evt).toBeDefined();
    expect(evt?.body?.kind).toBe('decoy_login');
    expect(evt?.body?.severity).toBe('critical');
    expect(evt?.body?.username).toBe('archon_intruder');
    expect(evt?.body?.detail?.canaryMatched).toBe(false);
  });

  it('2. POST /admin-old/auth with canary key emits honeytoken/critical without exposing key', async () => {
    const canary = 'AsclepiusGoldPass2026!';
    const res = await fetch(`${testAppUrl}/admin-old/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-vercel-forwarded-for': '198.51.100.112',
      },
      body: new URLSearchParams({ user: 'operator_canary', key: canary }).toString(),
    });

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 80));

    const evt = capturedEvents.find((e) => e.body?.path === '/admin-old/auth');
    expect(evt).toBeDefined();
    expect(evt?.body?.kind).toBe('honeytoken');
    expect(evt?.body?.severity).toBe('critical');
    expect(evt?.body?.detail?.canaryMatched).toBe(true);
    expect(JSON.stringify(evt?.body).includes(canary)).toBe(false);
  });

  it('3. POST /wp-login.php is exempt from CSRF, emits decoy_login, returns realistic WP error', async () => {
    const res = await fetch(`${testAppUrl}/wp-login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-vercel-forwarded-for': '198.51.100.113',
      },
      body: new URLSearchParams({ log: 'admin', pwd: 'password123' }).toString(),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('The username or password you entered is incorrect');
    expect(html).toContain('name="loginform"');
    expect(html).not.toContain('<div id="root"></div>');

    await new Promise((r) => setTimeout(r, 80));
    const evt = capturedEvents.find((e) => e.body?.path === '/wp-login.php');
    expect(evt).toBeDefined();
    expect(evt?.body?.kind).toBe('decoy_login');
    expect(evt?.body?.severity).toBe('critical');
    expect(evt?.body?.username).toBe('admin');
  });

  it('4. POST /wp-login.php with canary password emits honeytoken/critical', async () => {
    const canary = 'key_canary_vault_token_8819';
    const res = await fetch(`${testAppUrl}/wp-login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-vercel-forwarded-for': '198.51.100.114',
      },
      body: new URLSearchParams({ log: 'canary_admin', pwd: canary }).toString(),
    });

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 80));

    const evt = capturedEvents.find((e) => e.body?.path === '/wp-login.php');
    expect(evt).toBeDefined();
    expect(evt?.body?.kind).toBe('honeytoken');
    expect(evt?.body?.severity).toBe('critical');
    expect(evt?.body?.detail?.canaryMatched).toBe(true);
    expect(JSON.stringify(evt?.body).includes(canary)).toBe(false);
  });

  it('5. POST /phpmyadmin/index.php is exempt from CSRF, emits decoy_login, returns realistic error', async () => {
    const res = await fetch(`${testAppUrl}/phpmyadmin/index.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-vercel-forwarded-for': '198.51.100.115',
      },
      body: new URLSearchParams({ pma_username: 'root', pma_password: 'toor_password' }).toString(),
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('#1045 - Access denied for user');
    expect(html).not.toContain('<div id="root"></div>');

    await new Promise((r) => setTimeout(r, 80));
    const evt = capturedEvents.find((e) => e.body?.path === '/phpmyadmin/index.php');
    expect(evt).toBeDefined();
    expect(evt?.body?.kind).toBe('decoy_login');
    expect(evt?.body?.severity).toBe('critical');
  });

  it('6. POST decoy form body exceeding 2KB is capped / rejected with 413', async () => {
    const hugeBody = new URLSearchParams({
      log: 'attacker',
      pwd: 'a'.repeat(3000),
    }).toString();

    const res = await fetch(`${testAppUrl}/wp-login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-vercel-forwarded-for': '198.51.100.116',
      },
      body: hugeBody,
    });

    expect(res.status).toBe(413);
  });
});
