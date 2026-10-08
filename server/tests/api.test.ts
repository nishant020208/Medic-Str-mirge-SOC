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

describe('MediStore API & Security Suite', () => {
  it('GET /healthz returns { status: "ok", db: "ok" | "down" }', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(['ok', 'down']).toContain(body.db);
  });

  it('GET /api/products returns seeded medicines', async () => {
    const res = await fetch(`${baseUrl}/api/products`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(40);
    expect(body.products.length).toBe(40);
    expect(body.products[0]).toHaveProperty('batchId');
    expect(body.products[0]).toHaveProperty('price');
  });

  it('GET /api/products with filter q returns matching items', async () => {
    const res = await fetch(`${baseUrl}/api/products?q=aspirin`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
    expect(body.products[0].name.toLowerCase()).toContain('aspirin');
  });

  it('GET /api/auth/nonce returns a valid nonce and domain', async () => {
    const res = await fetch(`${baseUrl}/api/auth/nonce`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('nonce');
    expect(body).toHaveProperty('domain');
    expect(typeof body.nonce).toBe('string');
  });

  it('POST /api/auth/login validates credentials and sets session cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
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

    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toContain('connect.sid');
    const body = await res.json();
    expect(body.user.role).toBe('pharmacist');
  });

  it('POST /api/auth/login rejects invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'WrongPassword!',
      }),
    });

    expect(res.status).toBe(401);
  });

  it('Enforces CSRF on state-changing requests when X-Requested-With is missing', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'Demo@12345',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('CSRF');
  });

  it('Security: Trap routes like /admin-old or /.env are not swallowed by SPA', async () => {
    // A path like /.env returns convincing decoy and is not swallowed by the SPA fallback
    const res = await fetch(`${baseUrl}/.env`);
    const text = await res.text();
    expect(text).toContain('DATABASE_URL');
    expect(text).not.toContain('<div id="root">');
  });
});
