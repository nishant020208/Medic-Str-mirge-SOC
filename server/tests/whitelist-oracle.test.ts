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
      server.listen(0, () => {
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

describe('Sanctum Whitelist and Oracle Endpoints', () => {
  let pharmacistCookie: string;

  beforeAll(async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'Demo@12345',
      }),
    });

    expect(loginRes.status).toBe(200);
    pharmacistCookie = loginRes.headers.get('set-cookie') || '';
  });

  it('allows pharmacist to get the whitelist', async () => {
    const res = await fetch(`${baseUrl}/api/auth/whitelist`, {
      headers: {
        Cookie: pharmacistCookie,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('whitelist');
    expect(Array.isArray(body.whitelist)).toBe(true);
    expect(body.whitelist.some((w: any) => w.email === 'pharmacist@medistore.test')).toBe(true);
  });

  it('allows pharmacist to add a new devotee to the whitelist and allows them to log in', async () => {
    const testEmail = `seeker_${Date.now()}@temple.sanctum`;

    // 1. Add to whitelist
    const addRes = await fetch(`${baseUrl}/api/auth/whitelist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: pharmacistCookie,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: testEmail,
        role: 'customer',
        notes: 'Sanctum initiation test',
      }),
    });

    expect(addRes.status).toBe(201);
    const addBody = await addRes.json();
    expect(addBody.entry.email).toBe(testEmail.toLowerCase());

    // 2. Devotee can now log in
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'Demo@12345',
      }),
    });

    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.user.email).toBe(testEmail.toLowerCase());

    // 3. Remove from whitelist
    const delRes = await fetch(`${baseUrl}/api/auth/whitelist/${encodeURIComponent(testEmail)}`, {
      method: 'DELETE',
      headers: {
        Cookie: pharmacistCookie,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    expect(delRes.status).toBe(200);
  });

  it('blocks non-pharmacists from accessing whitelist endpoints', async () => {
    // Unauthenticated
    const unauthRes = await fetch(`${baseUrl}/api/auth/whitelist`, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    expect(unauthRes.status).toBe(401);

    // Authenticated as customer
    const custLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'customer@medistore.test',
        password: 'Demo@12345',
      }),
    });
    const customerCookie = custLogin.headers.get('set-cookie') || '';

    const forbiddenRes = await fetch(`${baseUrl}/api/auth/whitelist`, {
      headers: {
        Cookie: customerCookie,
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    expect(forbiddenRes.status).toBe(403);
  });

  it('provides answers from Oracle endpoint with fallback', async () => {
    const res = await fetch(`${baseUrl}/api/oracle/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ message: 'What remedies soothe coughs?' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('reply');
    expect(typeof body.reply).toBe('string');
    expect(body.reply.length).toBeGreaterThan(10);
  });
});
