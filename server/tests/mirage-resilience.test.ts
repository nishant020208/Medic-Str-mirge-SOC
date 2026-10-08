import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../src/app.js';
// @ts-ignore
import mirage from '../mirage.js';

let medistoreServer: http.Server;
let medistoreUrl: string;

let mockSocServer: http.Server;
let mockSocUrl: string;

interface CapturedEvent {
  headers: http.IncomingHttpHeaders;
  body: any;
}

let capturedEvents: CapturedEvent[] = [];
let mockBlocklistResponse: { status: number; body: any } = {
  status: 200,
  body: [],
};
let mockEventResponseStatus = 200;

beforeAll(async () => {
  // Start Mock MirageSOC Server
  mockSocServer = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      const url = req.url || '';
      if (url.startsWith('/api/blocklist')) {
        res.writeHead(mockBlocklistResponse.status, {
          'Content-Type': 'application/json',
        });
        if (typeof mockBlocklistResponse.body === 'string') {
          res.end(mockBlocklistResponse.body);
        } else {
          res.end(JSON.stringify(mockBlocklistResponse.body));
        }
      } else if (url.startsWith('/api/event')) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        capturedEvents.push({
          headers: req.headers,
          body: parsed,
        });
        res.writeHead(mockEventResponseStatus, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ status: 'received' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
  });

  await new Promise<void>((resolve) => {
    mockSocServer.listen(0, '127.0.0.1', () => {
      const addr = mockSocServer.address() as AddressInfo;
      mockSocUrl = `http://127.0.0.1:${addr.port}`;
      process.env.MIRAGE_URL = mockSocUrl;
      process.env.MIRAGE_API_KEY = 'test_mirage_api_key_valid';
      resolve();
    });
  });

  // Start MediStore Test Server
  medistoreServer = http.createServer(app);
  await new Promise<void>((resolve) => {
    medistoreServer.listen(0, '127.0.0.1', () => {
      const addr = medistoreServer.address() as AddressInfo;
      medistoreUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await Promise.all([
    new Promise<void>((resolve) => medistoreServer?.close(() => resolve())),
    new Promise<void>((resolve) => mockSocServer?.close(() => resolve())),
  ]);
});

beforeEach(() => {
  capturedEvents = [];
  mockBlocklistResponse = { status: 200, body: [] };
  mockEventResponseStatus = 200;
  process.env.MIRAGE_URL = mockSocUrl;
  process.env.MIRAGE_API_KEY = 'test_mirage_api_key_valid';
  mirage.handler = undefined;
  mirage.onLoginFailed = undefined;
  mirage.onLoginSucceeded = undefined;
});

describe('MirageSOC Resilience & Fail-Open Invariant Suite', () => {
  it('a) Fails open when MirageSOC is unreachable (connection refused/timeout)', async () => {
    // Point MIRAGE_URL to a non-existent port
    process.env.MIRAGE_URL = 'http://127.0.0.1:59999';

    const res = await fetch(`${medistoreUrl}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');

    const productsRes = await fetch(`${medistoreUrl}/api/products`);
    expect(productsRes.status).toBe(200);
  });

  it('b) Fails open when MirageSOC returns a 500 error or malformed JSON', async () => {
    // 1. MirageSOC returns 500 Internal Server Error
    mockBlocklistResponse = {
      status: 500,
      body: { error: 'Database connection failed' },
    };

    const res500 = await fetch(`${medistoreUrl}/healthz`, {
      headers: {
        'X-Forwarded-For': '198.51.100.12',
      },
    });
    expect(res500.status).toBe(200);

    // 2. MirageSOC returns malformed non-JSON body
    mockBlocklistResponse = {
      status: 200,
      body: '<html><body>502 Bad Gateway Nginx</body></html>',
    };

    const resMalformed = await fetch(`${medistoreUrl}/api/products`, {
      headers: {
        'X-Forwarded-For': '198.51.100.13',
      },
    });
    expect(resMalformed.status).toBe(200);
  });

  it('c) Blocks an IP on the blocklist with 403 Forbidden (plain text)', async () => {
    const blockedIp = '203.0.113.88';
    mockBlocklistResponse = {
      status: 200,
      body: [blockedIp],
    };

    // Request from blocked IP
    const blockedRes = await fetch(`${medistoreUrl}/api/products`, {
      headers: {
        'X-Forwarded-For': blockedIp,
      },
    });

    expect(blockedRes.status).toBe(403);
    const text = await blockedRes.text();
    expect(text).toBe('Forbidden');
    expect(blockedRes.headers.get('content-type')).toContain('text/plain');

    // Request from unblocked IP
    const allowedRes = await fetch(`${medistoreUrl}/api/products`, {
      headers: {
        'X-Forwarded-For': '203.0.113.89',
      },
    });
    expect(allowedRes.status).toBe(200);
  });

  it('d) Hitting /admin-old fires a POST /api/event to MirageSOC AND returns 404', async () => {
    const probeIp = '198.51.100.77';

    const res = await fetch(`${medistoreUrl}/admin-old`, {
      headers: {
        'X-Forwarded-For': probeIp,
        'User-Agent': 'TestReconnaissanceTool/1.0',
      },
    });

    expect(res.status).toBe(404);
    const bodyText = await res.text();
    expect(bodyText).toBe('Not found');
    expect(res.headers.get('content-type')).toContain('text/plain');

    // Allow fire-and-forget event fetch to land
    await new Promise((r) => setTimeout(r, 100));

    expect(capturedEvents.length).toBeGreaterThanOrEqual(1);
    const event = capturedEvents.find(
      (e) => e.body?.kind === 'trap_hit' && e.body?.path === '/admin-old'
    );
    expect(event).toBeDefined();
    expect(event?.headers['x-api-key']).toBe(process.env.MIRAGE_API_KEY);
    expect(event?.body?.severity).toBe('high');
    expect(event?.body?.ip).toBe(probeIp);
  });

  it('e) Honeytoken login fires a critical event to MirageSOC', async () => {
    const attackerIp = '198.51.100.95';

    const res = await fetch(`${medistoreUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Forwarded-For': attackerIp,
        'User-Agent': 'CredentialStuffer/2.0',
      },
      body: JSON.stringify({
        email: 'admin@asclepeion.med',
        password: 'AttemptPassword123',
      }),
    });

    // Login is rejected with 401
    expect(res.status).toBe(401);

    // Allow fire-and-forget event fetch to land
    await new Promise((r) => setTimeout(r, 100));

    expect(capturedEvents.length).toBeGreaterThanOrEqual(1);
    const honeytokenEvent = capturedEvents.find(
      (e) =>
        e.body?.severity === 'critical' &&
        (e.body?.kind === 'honeytoken_triggered' || e.body?.kind === 'honeytoken')
    );
    expect(honeytokenEvent).toBeDefined();
    expect(honeytokenEvent?.body?.username).toBe('admin@asclepeion.med');
    expect(honeytokenEvent?.body?.ip).toBe(attackerIp);
    expect(honeytokenEvent?.headers['x-api-key']).toBe(process.env.MIRAGE_API_KEY);
  });

  it('f) No unhandled promise rejections occur when MirageSOC events fail or crash', async () => {
    let unhandledRejectionOccurred = false;
    const rejectionHandler = (reason: any) => {
      unhandledRejectionOccurred = true;
      console.error('Unhandled rejection caught in test:', reason);
    };

    process.on('unhandledRejection', rejectionHandler);

    try {
      // Mock SOC returns 500 for events
      mockEventResponseStatus = 500;
      mockBlocklistResponse = { status: 500, body: 'Failure' };

      // Make various requests that trigger events
      await fetch(`${medistoreUrl}/admin-old`, {
        headers: { 'X-Forwarded-For': '198.51.100.99' },
      });

      await fetch(`${medistoreUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Forwarded-For': '198.51.100.99',
        },
        body: JSON.stringify({
          email: 'root',
          password: 'wrong',
        }),
      });

      // Wait to ensure any background async actions have settled
      await new Promise((r) => setTimeout(r, 200));

      expect(unhandledRejectionOccurred).toBe(false);
    } finally {
      process.removeListener('unhandledRejection', rejectionHandler);
    }
  });
});
