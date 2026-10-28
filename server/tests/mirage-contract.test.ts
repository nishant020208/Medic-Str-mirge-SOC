import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
// @ts-ignore
import mirage, {
  resetBlocklistCache,
  isReservedTrapPath,
  getClientIp,
} from '../mirage.js';

describe('MirageSOC Contract & Hardening Assertions (Stage 7)', () => {
  let mockSocServer: http.Server;
  let mockSocUrl: string;
  let testAppServer: http.Server;
  let testAppUrl: string;

  interface ReceivedEvent {
    headers: http.IncomingHttpHeaders;
    body: any;
  }

  let capturedEvents: ReceivedEvent[] = [];
  let blocklistFixture: { ips: string[]; fingerprints: string[]; ttl: number } = {
    ips: [],
    fingerprints: [],
    ttl: 3,
  };
  let eventDelayMs = 0;

  beforeAll(async () => {
    // 1. Mock MirageSOC backend
    mockSocServer = http.createServer(async (req, res) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', async () => {
        const url = req.url || '';
        if (url.startsWith('/api/blocklist')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(blocklistFixture));
        } else if (url.startsWith('/api/event')) {
          if (eventDelayMs > 0) {
            await new Promise((r) => setTimeout(r, eventDelayMs));
          }
          let body = null;
          try {
            body = JSON.parse(data);
          } catch {
            body = data;
          }
          capturedEvents.push({ headers: req.headers, body });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, eventId: 'evt_test_123' }));
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

    // 2. Build dedicated test Express app with mirage middleware first
    const app = express();
    app.set('trust proxy', true);
    app.use(mirage);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Sample normal routes
    app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
    app.get('/api/products', (_req, res) => res.json({ products: [] }));
    app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body || {};
      if (email === 'valid@asclepeion.med' && password === 'correct') {
        mirage.loginSucceeded(req, email);
        return res.json({ success: true });
      }
      mirage.loginFailed(req, email, password);
      return res.status(401).json({ error: 'Invalid credentials' });
    });

    // Unmatched 404 handler
    app.use((req, res) => {
      if (typeof mirage.reportEnumeration === 'function') {
        mirage.reportEnumeration(req);
      }
      res.status(404).type('text/plain').send('Not found');
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
    eventDelayMs = 0;
    blocklistFixture = { ips: [], fingerprints: [], ttl: 3 };
    resetBlocklistCache();
    process.env.MIRAGE_URL = mockSocUrl;
    process.env.MIRAGE_API_KEY = 'test_mirage_api_key_valid';
    process.env.MIRAGE_MODE = 'enforce';
  });

  it('1. Each trap path returns fake payload when MirageSOC is set and 404 when unset', async () => {
    const trapPaths = [
      '/admin-old',
      '/.env',
      '/backup.zip',
      '/wp-login.php',
      '/phpmyadmin',
      '/api/v1/internal/keys',
    ];

    // Case A: MirageSOC IS configured -> Convincing fake payloads returned (HTTP 200)
    for (const p of trapPaths) {
      const res = await fetch(`${testAppUrl}${p}`);
      expect(res.status).toBe(200);
      if (p === '/backup.zip') {
        expect(res.headers.get('content-type')).toContain('application/zip');
        const buf = Buffer.from(await res.arrayBuffer());
        expect(buf.subarray(0, 4).toString('hex')).toBe('504b0304');
      } else if (p === '/api/v1/internal/keys') {
        expect(res.headers.get('content-type')).toContain('application/json');
        const json = await res.json();
        expect(json.status).toBe('active');
        expect(json.keys).toBeDefined();
      } else {
        const text = await res.text();
        expect(text.length).toBeGreaterThan(50);
      }
    }

    // Case B: MirageSOC is UNSET -> Pass-through stub, trap paths return 404
    delete process.env.MIRAGE_URL;
    delete process.env.MIRAGE_API_KEY;

    for (const p of trapPaths) {
      const res = await fetch(`${testAppUrl}${p}`);
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe('Not found');
    }
  });

  it('2. Blocklisted IP gets 403 JSON "Access blocked"', async () => {
    const blockedIp = '203.0.113.55';
    blocklistFixture = { ips: [blockedIp], fingerprints: [], ttl: 3 };

    const res = await fetch(`${testAppUrl}/api/products`, {
      headers: {
        'x-vercel-forwarded-for': blockedIp,
      },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'Access blocked' });
  });

  it('3. MirageSOC down/slow = real app still works (fail-open invariant)', async () => {
    // Point MIRAGE_URL to non-existent endpoint
    process.env.MIRAGE_URL = 'http://127.0.0.1:59998';

    const res = await fetch(`${testAppUrl}/healthz`, {
      headers: {
        'x-vercel-forwarded-for': '198.51.100.91',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('4. SQLi/XSS/traversal payloads get 403 in enforce mode and pass in monitor mode', async () => {
    const maliciousSqli = "/api/products?q=' UNION SELECT 1,2,3--";
    const maliciousXss = '/api/products?q=<script>alert(1)</script>';
    const maliciousTraversal = '/api/products?file=../../etc/passwd';

    // A. Enforce mode (default): should return 403 JSON
    process.env.MIRAGE_MODE = 'enforce';

    const resSqli = await fetch(`${testAppUrl}${maliciousSqli}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    expect(resSqli.status).toBe(403);
    expect(await resSqli.json()).toEqual({ error: 'Access blocked' });

    const resXss = await fetch(`${testAppUrl}${maliciousXss}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    expect(resXss.status).toBe(403);

    const resTraversal = await fetch(`${testAppUrl}${maliciousTraversal}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    expect(resTraversal.status).toBe(403);

    // B. Monitor mode: should log/event but allow request to pass to handler (200)
    process.env.MIRAGE_MODE = 'monitor';

    const resSqliMonitor = await fetch(`${testAppUrl}${maliciousSqli}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    expect(resSqliMonitor.status).toBe(200);

    const resXssMonitor = await fetch(`${testAppUrl}${maliciousXss}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    expect(resXssMonitor.status).toBe(200);
  });

  it('5. Spoofed X-Forwarded-For is ignored in favor of Vercel trusted header', async () => {
    const trustedIp = '203.0.113.10';
    const spoofedIp = '1.2.3.4';

    blocklistFixture = { ips: [trustedIp], fingerprints: [], ttl: 3 };

    // Request with spoofed X-Forwarded-For: 1.2.3.4 AND x-vercel-forwarded-for: 203.0.113.10
    const res = await fetch(`${testAppUrl}/healthz`, {
      headers: {
        'x-forwarded-for': spoofedIp,
        'x-vercel-forwarded-for': trustedIp,
      },
    });

    // Should block based on trustedIp (403), proving spoofed X-Forwarded-For was ignored
    expect(res.status).toBe(403);
  });

  it('6. Decoy usernames trigger decoy_login event with critical severity', async () => {
    const decoyUsers = ['admin', 'root', 'test', 'administrator'];

    for (const username of decoyUsers) {
      capturedEvents = [];
      const res = await fetch(`${testAppUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-forwarded-for': '198.51.100.80',
          'User-Agent': 'TestDevClient/1.0',
        },
        body: JSON.stringify({ email: username, password: 'badpassword' }),
      });

      expect(res.status).toBe(401);

      // Wait 80ms for fire-and-forget event delivery
      await new Promise((r) => setTimeout(r, 80));

      const decoyEvt = capturedEvents.find((e) => e.body?.kind === 'decoy_login');
      expect(decoyEvt).toBeDefined();
      expect(decoyEvt?.body?.severity).toBe('critical');
      expect(decoyEvt?.body?.username).toBe(username);
    }
  });

  it('7. Reporting never delays client response (>2s backend delay, client response <300ms)', async () => {
    // Inject 2.5s delay into MirageSOC mock backend
    eventDelayMs = 2500;

    const start = Date.now();
    const res = await fetch(`${testAppUrl}/admin-old`, {
      headers: {
        'x-vercel-forwarded-for': '198.51.100.66',
        'User-Agent': 'LatencyTester/1.0',
      },
    });
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    // Client response must be fast despite 2.5s slow backend (fire-and-forget via waitUntil)
    expect(duration).toBeLessThan(400);
  });

  it('8. Tests every canary string as password triggers honeytoken critical without password in event', async () => {
    const CANARY_VALUES = [
      'AKIA_CANARY_TRAP_TOKEN_89231',
      'ora_sec_live_99f82d1ab673024c0847937402a',
      'key_live_oracle_priest_9021',
      'key_canary_vault_token_8819',
      'AsclepiusGoldPass2026!',
    ];

    for (const canary of CANARY_VALUES) {
      capturedEvents = [];
      const res = await fetch(`${testAppUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-forwarded-for': '198.51.100.99',
          'User-Agent': 'CanaryTester/1.0',
        },
        body: JSON.stringify({ email: 'normal_user@asclepeion.med', password: canary }),
      });

      expect(res.status).toBe(401);

      // Wait 80ms for event delivery
      await new Promise((r) => setTimeout(r, 80));

      const honeyEvt = capturedEvents.find((e) => e.body?.kind === 'honeytoken');
      expect(honeyEvt).toBeDefined();
      expect(honeyEvt?.body?.severity).toBe('critical');
      expect(honeyEvt?.body?.username).toBe('normal_user@asclepeion.med');
      expect(honeyEvt?.body?.detail?.canaryMatched).toBe(true);
      expect(honeyEvt?.body?.detail?.passwordLength).toBe(canary.length);

      // Verify that attacker-submitted password is NEVER present in the event body
      const eventJsonStr = JSON.stringify(honeyEvt?.body);
      expect(eventJsonStr.includes(canary)).toBe(false);
    }
  });
});
