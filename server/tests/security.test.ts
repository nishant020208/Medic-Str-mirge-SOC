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

describe('Security Audit & Hardening Suite', () => {
  it('Helmet Content-Security-Policy header is active and strict', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('Session cookies enforce HttpOnly and SameSite=Lax', async () => {
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
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('connect.sid');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
  });

  it('CSRF check rejects POST request without custom X-Requested-With header', async () => {
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
    expect(body.error).toContain('CSRF precaution triggered');
  });

  it('Zod rejects malformed input schemas with 400 status', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'invalid-email-string',
        password: '',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid scroll credentials format');
  });

  it('Login Rate Limiter enforces 10/min threshold: 11th attempt returns 429', async () => {
    // Send 10 rapid login attempts
    for (let i = 1; i <= 10; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          email: `bruteforce_${i}@medistore.test`,
          password: 'WrongPassword',
        }),
      });
      // The first attempts should be 401 (or 429 if prior tests consumed quota)
      expect([401, 429]).toContain(res.status);
    }

    // 11th attempt MUST be 429 Too Many Requests
    const res11 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'bruteforce_final@medistore.test',
        password: 'WrongPassword',
      }),
    });

    expect(res11.status).toBe(429);
    const body = await res11.json();
    expect(body.error).toContain('Too many unauthorized entry attempts');
  });
});
