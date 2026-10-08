import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../src/app.js';
import { store } from '../src/data/store.js';
import { getPostgresPool } from '../src/data/db.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Vercel Serverless & Stateless Invariant Tests', () => {
  it('1. Login success and failure through request handler', async () => {
    // Failure
    const failRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Forwarded-For': '198.51.100.99',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'WrongPassword!999',
      }),
    });
    expect(failRes.status).toBe(401);
    const failBody = await failRes.json();
    expect(failBody.error).toBe('Invalid sanctum email or passphrase');

    // Success
    const successRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Forwarded-For': '198.51.100.99',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'Demo@12345',
      }),
    });
    expect(successRes.status).toBe(200);
    const successBody = await successRes.json();
    expect(successBody.user.email).toBe('pharmacist@medistore.test');
    expect(successBody.user.role).toBe('pharmacist');
  });

  it('2. Missing DATABASE_URL env var handling: falls back gracefully without crashing', () => {
    const emptyPool = getPostgresPool('');
    expect(emptyPool).toBeNull();
  });

  it('3. Session persists across two separate invocations', async () => {
    // 1st invocation: Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Forwarded-For': '198.51.100.98',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'Demo@12345',
      }),
    });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers.get('set-cookie');
    expect(cookie).toBeTruthy();

    // 2nd invocation: Check current user session with the cookie
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: cookie!,
      },
    });
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user).toBeTruthy();
    expect(meBody.user.email).toBe('pharmacist@medistore.test');
  });

  it('4. Single-use wallet nonces: cannot be reused', async () => {
    const nonce = await store.createNonce('http://127.0.0.1');
    expect(nonce).toBeTruthy();

    // First verification consumes the nonce
    const firstVerify = await store.verifyAndConsumeNonce(nonce);
    expect(firstVerify).toBe(true);

    // Second verification MUST be rejected
    const secondVerify = await store.verifyAndConsumeNonce(nonce);
    expect(secondVerify).toBe(false);
  });

  it('5. Trap paths return convincing fake decoy responses and are never swallowed by SPA', async () => {
    const resAdmin = await fetch(`${baseUrl}/admin-old`);
    expect(resAdmin.status).toBe(200);
    expect(await resAdmin.text()).toContain('Asclepeion Admin Console');

    const resEnv = await fetch(`${baseUrl}/.env`);
    expect(resEnv.status).toBe(200);
    expect(await resEnv.text()).toContain('DATABASE_URL');

    const resBackup = await fetch(`${baseUrl}/backup.zip`);
    expect(resBackup.status).toBe(200);
    expect(resBackup.headers.get('content-type')).toContain('application/zip');

    const resWp = await fetch(`${baseUrl}/wp-login.php`);
    expect(resWp.status).toBe(200);
    expect(await resWp.text()).toContain('WordPress');

    const resPma = await fetch(`${baseUrl}/phpmyadmin`);
    expect(resPma.status).toBe(200);
    expect(await resPma.text()).toContain('phpMyAdmin');

    const resKeys = await fetch(`${baseUrl}/api/v1/internal/keys`);
    expect(resKeys.status).toBe(200);
    const keysJson = await resKeys.json();
    expect(keysJson.status).toBe('active');
  });

  it('6. Rate limiting enforces login threshold', async () => {
    const customIp = '198.51.100.42';
    let hitRateLimit = false;

    for (let i = 1; i <= 12; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Forwarded-For': customIp,
        },
        body: JSON.stringify({
          email: 'invalid@devotee.test',
          password: 'wrong',
        }),
      });

      if (res.status === 429) {
        hitRateLimit = true;
        break;
      }
    }

    expect(hitRateLimit).toBe(true);
  });
});
