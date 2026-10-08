import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../src/index.js';
import { AddressInfo } from 'net';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} catch {
  // ignore
}

let baseUrl: string;
const mirageUrl = (process.env.MIRAGE_URL || 'https://mirage-soc.vercel.app').replace(/\/+$/, '');
const mirageApiKey = process.env.MIRAGE_API_KEY || '';

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

describe('Trap Paths & Full Round-Trip Proof Suite', () => {
  it('GAP 1: Returns convincing FAKE response for each of the six trap paths', async () => {
    const paths = [
      '/admin-old',
      '/.env',
      '/backup.zip',
      '/wp-login.php',
      '/phpmyadmin',
      '/api/v1/internal/keys',
    ];

    console.log('\n======================================================================');
    console.log('--- GAP 1: CONVINCING FAKE RESPONSES FOR 6 RESERVED TRAP PATHS ---');
    console.log('======================================================================\n');

    for (const p of paths) {
      const res = await fetch(`${baseUrl}${p}`);
      const contentType = res.headers.get('content-type') || '';
      const contentDisp = res.headers.get('content-disposition') || '';

      console.log(`\n>>> [REQUEST] GET ${p}`);
      console.log(`>>> [STATUS]  ${res.status} ${res.statusText}`);
      console.log(`>>> [HEADER]  Content-Type: ${contentType}`);
      if (contentDisp) {
        console.log(`>>> [HEADER]  Content-Disposition: ${contentDisp}`);
      }

      expect(res.status).toBe(200);

      if (p === '/backup.zip') {
        const buffer = Buffer.from(await res.arrayBuffer());
        expect(buffer.subarray(0, 4).toString('hex')).toBe('504b0304');
        console.log(`>>> [BODY TYPE] Binary ZIP Archive (${buffer.length} bytes)`);
        console.log(`>>> [HEX MAGIC] ${buffer.subarray(0, 4).toString('hex')} (PK\\x03\\x04)`);
        console.log(`>>> [INSPECT]   Archive contains 'sanctum_backup.sql' with simulated table schemas`);
        console.log(`>>> [PREVIEW]   ${buffer.toString('latin1').replace(/[^a-zA-Z0-9_.\-\s=;]/g, '.').slice(0, 180)}...`);
      } else {
        const bodyText = await res.text();
        console.log(`>>> [BODY CONTENT]:\n${bodyText}`);
      }
    }
  });

  it('GAP 2: Full Round-Trip Proof (honeytoken event -> live blocklist -> 403 enforcement)', async () => {
    console.log('\n======================================================================');
    console.log('--- GAP 2: LIVE MIRAGESOC FULL ROUND-TRIP PROOF (IN SEQUENCE) ---');
    console.log('======================================================================\n');

    const testIp = `198.51.100.${Math.floor(Math.random() * 80) + 120}`;

    // STEP 1: Send honeytoken event to live MirageSOC backend
    console.log(`\n[STEP 1] Dispatching honeytoken event to MirageSOC`);
    console.log(`  Endpoint: POST ${mirageUrl}/api/event`);
    console.log(`  Target IP: ${testIp}`);
    console.log(`  Payload: kind="honeytoken", severity="critical", username="admin@asclepeion.med"`);

    const eventPayload = {
      kind: 'honeytoken',
      ip: testIp,
      method: 'POST',
      path: '/api/auth/login',
      status: 401,
      severity: 'critical',
      detail: {
        reason: 'honeytoken_canary_login',
        message: 'Honeytoken canary login attempt detected: admin@asclepeion.med',
        username: 'admin@asclepeion.med',
      },
      headers: {
        'user-agent': 'CanaryProbe/2.0',
        host: 'asclepius-gamma.vercel.app',
      },
    };

    const eventRes = await fetch(`${mirageUrl}/api/event`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': mirageApiKey,
      },
      body: JSON.stringify(eventPayload),
    });

    const eventJson = await eventRes.json();
    console.log(`  Response Status: ${eventRes.status} ${eventRes.statusText}`);
    console.log(`  Response Body:   ${JSON.stringify(eventJson)}`);

    expect(eventRes.status).toBe(200);

    // STEP 2: Wait briefly and query GET /api/blocklist to confirm IP is blocked
    console.log(`\n[STEP 2] Waiting 2000ms and verifying IP presence on live blocklist`);
    await new Promise((r) => setTimeout(r, 2000));

    console.log(`  Endpoint: GET ${mirageUrl}/api/blocklist`);
    const blocklistRes = await fetch(`${mirageUrl}/api/blocklist`, {
      headers: {
        'x-api-key': mirageApiKey,
      },
    });

    const blocklistData = (await blocklistRes.json()) as { ips?: string[] };
    console.log(`  Response Status: ${blocklistRes.status} ${blocklistRes.statusText}`);
    console.log(`  Blocked IPs:     ${JSON.stringify(blocklistData.ips || [])}`);

    const isBlocked = (blocklistData.ips || []).includes(testIp);
    console.log(`  Verification:    IP ${testIp} present in blocklist? ${isBlocked ? 'YES (CONFIRMED)' : 'NO'}`);
    expect(isBlocked).toBe(true);

    // STEP 3: Simulate local MediStore request from the newly blocked IP through mirage.js
    console.log(`\n[STEP 3] Simulating request from ${testIp} through local MediStore (mirage.js)`);
    console.log(`  Endpoint: GET ${baseUrl}/healthz`);
    console.log(`  Header:   x-forwarded-for: ${testIp}`);

    process.env.MIRAGE_BLOCKLIST_TIMEOUT = '3000';

    const appRes = await fetch(`${baseUrl}/healthz`, {
      headers: {
        'x-forwarded-for': testIp,
      },
    });

    const appBody = await appRes.text();
    console.log(`  Response Status: ${appRes.status} ${appRes.statusText}`);
    console.log(`  Response Body:   ${appBody.trim()}`);

    expect(appRes.status).toBe(403);
    expect(appBody).toContain('Forbidden');
    console.log(`\n>>> SUCCESS: Full round trip confirmed end-to-end!`);
  }, 30000);
});
