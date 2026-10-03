import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { app, server } from '../src/index.js';
// @ts-ignore
import mirage from '../mirage.js';
import { AddressInfo } from 'net';
import { ethers } from 'ethers';

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

describe('Mirage Hook Order, Trust Proxy, and Auth Audit', () => {
  beforeEach(() => {
    mirage.handler = undefined;
    mirage.onLoginFailed = undefined;
    mirage.onLoginSucceeded = undefined;
  });

  it('Verifies trust proxy is enabled on Express app', () => {
    expect(app.get('trust proxy')).toBe(true);
  });

  it('Proves mirage runs first for "/", "/api/products", and "/admin-old"', async () => {
    const executedSteps: string[] = [];

    mirage.handler = (req: any, res: any, next: any) => {
      executedSteps.push(`mirage:${req.path}`);
      next();
    };

    // 1. Request to "/"
    await fetch(`${baseUrl}/`);
    expect(executedSteps).toContain('mirage:/');

    // 2. Request to "/api/products"
    await fetch(`${baseUrl}/api/products`);
    expect(executedSteps).toContain('mirage:/api/products');

    // 3. Request to "/admin-old"
    await fetch(`${baseUrl}/admin-old`);
    expect(executedSteps).toContain('mirage:/admin-old');

    // Confirm mirage was the first middleware in the router stack
    const stack = (app as any)._router?.stack || [];
    const firstUserMiddleware = stack.find((layer: any) => layer.name === 'mirage');
    expect(firstUserMiddleware).toBeDefined();
    // First middleware right after internal express init/query is mirage
    const mirageIndex = stack.indexOf(firstUserMiddleware);
    expect(mirageIndex).toBeLessThan(4); // positioned before routes and static handlers
  });

  it('Calls loginFailed on email login failure', async () => {
    const failedSpy = vi.fn();
    mirage.onLoginFailed = failedSpy;

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'IncorrectPassword',
      }),
    });

    expect(res.status).toBe(401);
    expect(failedSpy).toHaveBeenCalledWith(expect.anything(), 'pharmacist@medistore.test');
  });

  it('Calls loginSucceeded on email login success', async () => {
    const successSpy = vi.fn();
    mirage.onLoginSucceeded = successSpy;

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
    expect(successSpy).toHaveBeenCalledWith(expect.anything(), 'pharmacist@medistore.test');
  });

  it('Calls loginFailed on wallet login failure (invalid signature / bad nonce)', async () => {
    const failedSpy = vi.fn();
    mirage.onLoginFailed = failedSpy;

    const dummyWallet = ethers.Wallet.createRandom();

    const res = await fetch(`${baseUrl}/api/auth/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        address: dummyWallet.address,
        message: 'Invalid devotional text',
        signature: '0x1234567890abcdef',
        nonce: 'non-existent-nonce-999',
      }),
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(failedSpy).toHaveBeenCalledWith(expect.anything(), dummyWallet.address.toLowerCase());
  });

  it('Calls loginSucceeded on wallet login success', async () => {
    const successSpy = vi.fn();
    mirage.onLoginSucceeded = successSpy;

    // 1. Fetch valid nonce
    const nonceRes = await fetch(`${baseUrl}/api/auth/nonce`);
    const { nonce } = await nonceRes.json();

    // 2. Sign devotional message with real ethers wallet
    const testWallet = ethers.Wallet.createRandom();
    const message = `Sign this sacred devotional proof to commune with the Oracle of Asclepius. Nonce: ${nonce}`;
    const signature = await testWallet.signMessage(message);

    // 3. Post to /api/auth/wallet
    const res = await fetch(`${baseUrl}/api/auth/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        address: testWallet.address,
        message,
        signature,
        nonce,
      }),
    });

    expect(res.status).toBe(200);
    expect(successSpy).toHaveBeenCalledWith(expect.anything(), testWallet.address.toLowerCase());
  });
});
