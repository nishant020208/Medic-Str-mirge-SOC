import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/app.js';
// @ts-ignore
import { resetBlocklistCache } from '../mirage.js';
import {
  isKnownClientRoute,
  getDerivedClientRoutes,
  checkRateLimitCounter,
} from '../src/middleware/defense.js';
import * as dbModule from '../src/data/db.js';

describe('Serverless-Safe Flood and Enumeration Protection (Postgres rate_limits)', () => {
  let mockSocServer: http.Server;
  let mockSocUrl: string;
  let testAppServer: http.Server;
  let testAppUrl: string;

  interface ReceivedEvent {
    headers: http.IncomingHttpHeaders;
    body: any;
  }

  let capturedEvents: ReceivedEvent[] = [];

  // In-memory simulation of the Postgres rate_limits table for unit test isolation
  const mockDbTable = new Map<string, { count: number; resetAt: number }>();

  beforeAll(async () => {
    // 1. Mock MirageSOC receiver
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
    mockDbTable.clear();
    resetBlocklistCache();
    process.env.MIRAGE_URL = mockSocUrl;
    process.env.MIRAGE_API_KEY = 'test_mirage_api_key_valid';
    process.env.MIRAGE_MODE = 'enforce';
  });

  it('1. Derives known routes dynamically from client/src/App.tsx router', () => {
    const { staticRoutes, dynamicPatterns } = getDerivedClientRoutes();

    // Verify key client routes are present
    expect(staticRoutes.has('/')).toBe(true);
    expect(staticRoutes.has('/shop')).toBe(true);
    expect(staticRoutes.has('/cart')).toBe(true);
    expect(staticRoutes.has('/checkout')).toBe(true);
    expect(staticRoutes.has('/login')).toBe(true);
    expect(staticRoutes.has('/oracle')).toBe(true);
    expect(staticRoutes.has('/terminal')).toBe(true);

    // Verify dynamic route regex works
    expect(isKnownClientRoute('/shop/med-01')).toBe(true);
    expect(isKnownClientRoute('/order-confirmation/ord-992')).toBe(true);

    // Verify unknown non-extension paths are recognized as unknown
    expect(isKnownClientRoute('/unknown-secret-sanctum')).toBe(false);
    expect(isKnownClientRoute('/super-admin-panel')).toBe(false);
  });

  it('2. Fails open silently when DB is unavailable', async () => {
    // Spy on getPostgresPool returning null (simulating DB offline)
    const spy = vi.spyOn(dbModule, 'getPostgresPool').mockReturnValue(null);

    const result = await checkRateLimitCounter('test:key', 5, 5000);
    expect(result).toBeNull();

    // Verify clean request works without throwing
    const res = await fetch(`${testAppUrl}/healthz`);
    expect(res.status).toBe(200);

    spy.mockRestore();
  });

  it('3. Simulates Postgres rate_limits: flood emits once per window (>25 in 5s)', async () => {
    // Mock getPostgresPool to execute against mockDbTable matching the real Postgres SQL semantics
    const mockPool: any = {
      query: vi.fn(async (queryText: string, params: any[]) => {
        const [key, windowEnd] = params;
        const now = Date.now();
        const existing = mockDbTable.get(key);

        let count = 1;
        let resetAt = new Date(windowEnd).getTime();

        if (existing) {
          if (existing.resetAt <= now) {
            count = 1;
          } else {
            count = existing.count + 1;
            resetAt = existing.resetAt;
          }
        }
        mockDbTable.set(key, { count, resetAt });
        return { rows: [{ count }] };
      }),
    };

    const spy = vi.spyOn(dbModule, 'getPostgresPool').mockReturnValue(mockPool);

    const clientIp = '198.51.100.220';

    // Send 30 rapid requests concurrently from the same IP (within 50ms)
    await Promise.all(
      Array.from({ length: 30 }, () =>
        fetch(`${testAppUrl}/`, {
          headers: { 'x-vercel-forwarded-for': clientIp },
        })
      )
    );

    // Wait 150ms for async fire-and-forget event
    await new Promise((r) => setTimeout(r, 150));

    const floodEvents = capturedEvents.filter((e) => e.body?.kind === 'flood');
    // Must emit exactly once per window (at request #26)
    expect(floodEvents.length).toBe(1);
    expect(floodEvents[0].body?.ip).toBe(clientIp);
    expect(floodEvents[0].body?.detail?.threshold).toBe(25);

    spy.mockRestore();
  });

  it('4. Simulates Postgres rate_limits: enumeration emits once per window (>=10 unknown non-extension paths in 60s, SPA still served)', async () => {
    const mockPool: any = {
      query: vi.fn(async (queryText: string, params: any[]) => {
        const [key, windowEnd] = params;
        const now = Date.now();
        const existing = mockDbTable.get(key);

        let count = 1;
        let resetAt = new Date(windowEnd).getTime();

        if (existing) {
          if (existing.resetAt <= now) {
            count = 1;
          } else {
            count = existing.count + 1;
            resetAt = existing.resetAt;
          }
        }
        mockDbTable.set(key, { count, resetAt });
        return { rows: [{ count }] };
      }),
    };

    const spy = vi.spyOn(dbModule, 'getPostgresPool').mockReturnValue(mockPool);

    const clientIp = '198.51.100.221';

    // Probe 12 distinct unknown non-extension paths
    for (let i = 1; i <= 12; i++) {
      const res = await fetch(`${testAppUrl}/probe-path-${i}`, {
        headers: { 'x-vercel-forwarded-for': clientIp },
      });
      // The SPA fallback must still serve 200 with HTML!
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('<!DOCTYPE html>');
    }

    // Wait 100ms for async event
    await new Promise((r) => setTimeout(r, 100));

    const enumEvents = capturedEvents.filter((e) => e.body?.kind === 'enumeration');
    // Must emit exactly once per window (at probe #10)
    expect(enumEvents.length).toBe(1);
    expect(enumEvents[0].body?.ip).toBe(clientIp);
    expect(enumEvents[0].body?.detail?.threshold).toBe(10);

    spy.mockRestore();
  });

  it('5. Clean pages (/, /shop, /login, /oracle) emit NOTHING to MirageSOC', async () => {
    capturedEvents = [];
    const cleanPaths = ['/', '/shop', '/login', '/oracle'];

    for (const p of cleanPaths) {
      const res = await fetch(`${testAppUrl}${p}`, {
        headers: { 'x-vercel-forwarded-for': '198.51.100.222' },
      });
      expect(res.status).toBe(200);
    }

    await new Promise((r) => setTimeout(r, 100));
    expect(capturedEvents.length).toBe(0);
  });

  it('6. False-positive search corpus passes with 200 and emits 0 events', async () => {
    capturedEvents = [];
    const legitimateQueries = [
      'aspirin',
      'vitamin c',
      'paracetamol 500',
      "O'Brien",
      'rock-n-roll',
      'The ancient healing herbs of Epidaurus sanctum dispensary 1234',
    ];

    for (const q of legitimateQueries) {
      const res = await fetch(`${testAppUrl}/api/products?q=${encodeURIComponent(q)}`, {
        headers: { 'x-vercel-forwarded-for': '198.51.100.223' },
      });
      expect(res.status).toBe(200);
    }

    await new Promise((r) => setTimeout(r, 100));
    expect(capturedEvents.length).toBe(0);
  });
});
