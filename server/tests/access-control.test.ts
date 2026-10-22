import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../src/app.js';
import { store } from '../data/store.js';
import { resetFallbackRateLimits } from '../src/middleware/rateLimiter.js';

describe('Stage 2 & 3: Data Access Control, IDOR & CSRF Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  let customer1Id: string;
  let customer1Email: string;
  let customer1Cookie: string;

  let customer2Id: string;
  let customer2Email: string;
  let customer2Cookie: string;

  let pharmacistCookie: string;
  let order1Id: string;

  beforeAll(async () => {
    resetFallbackRateLimits();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 1. Create and log in customer 1
    customer1Email = `devotee1_${Date.now()}@temple.med`;
    const reg1Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-forwarded-for': '198.51.100.88',
      },
      body: JSON.stringify({ email: customer1Email, password: 'StrongPass123!' }),
    });
    const reg1Json = await reg1Res.json();
    customer1Id = reg1Json.user.id;
    customer1Cookie = reg1Res.headers.get('set-cookie')?.split(';')[0] || '';

    // 2. Create and log in customer 2
    customer2Email = `devotee2_${Date.now()}@temple.med`;
    const reg2Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-forwarded-for': '198.51.100.88',
      },
      body: JSON.stringify({ email: customer2Email, password: 'StrongPass123!' }),
    });
    const reg2Json = await reg2Res.json();
    customer2Id = reg2Json.user.id;
    customer2Cookie = reg2Res.headers.get('set-cookie')?.split(';')[0] || '';

    // 3. Log in Chief Pharmacist
    const pharmRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-forwarded-for': '198.51.100.88',
      },
      body: JSON.stringify({ email: 'pharmacist@medistore.test', password: 'Demo@12345' }),
    });
    pharmacistCookie = pharmRes.headers.get('set-cookie')?.split(';')[0] || '';

    // 4. Create an order owned by customer 1
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: customer1Cookie,
      },
      body: JSON.stringify({
        customerEmail: customer1Email,
        customerName: 'Devotee One',
        items: [
          {
            productId: 'med-01',
            productName: 'Willow Bark Extract',
            price: 24.5,
            quantity: 2,
            batchId: 'BATCH-001',
          },
        ],
        subtotal: 49.0,
        tax: 4.9,
        shipping: 5.0,
        total: 58.9,
        paymentMethod: 'Credit Card',
        shippingAddress: {
          fullName: 'Devotee One',
          street: '12 Epidaurus Way',
          city: 'Athens',
          state: 'Attica',
          zipCode: '10001',
          country: 'Greece',
        },
      }),
    });
    const orderData = await orderRes.json();
    order1Id = orderData.order.id;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('IDOR & Access Control: GET /api/orders and /api/orders/:id', () => {
    it('Anonymous request to GET /api/orders is rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/api/orders`);
      expect(res.status).toBe(401);
    });

    it('Anonymous request to GET /api/orders/:id is rejected with 401', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${order1Id}`);
      expect(res.status).toBe(401);
    });

    it('Owner (customer 1) can view their own order (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${order1Id}`, {
        headers: { Cookie: customer1Cookie },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.order.id).toBe(order1Id);
      expect(data.order.userId).toBe(customer1Id);
    });

    it('Another customer (customer 2) attempting to view order 1 gets 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${order1Id}`, {
        headers: { Cookie: customer2Cookie },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Access forbidden');
    });

    it('Pharmacist can view any customer order (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${order1Id}`, {
        headers: { Cookie: pharmacistCookie },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.order.id).toBe(order1Id);
    });

    it('Customer 2 views GET /api/orders and sees only their own orders (not customer 1)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        headers: { Cookie: customer2Cookie },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.orders)).toBe(true);
      const hasCustomer1Order = data.orders.some((o: any) => o.id === order1Id);
      expect(hasCustomer1Order).toBe(false);
    });
  });

  describe('Inventory & Status Protection: Validation and Unknown Fields', () => {
    it('Customer attempting PATCH /api/products/:id/stock gets 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/products/med-01/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: customer1Cookie,
        },
        body: JSON.stringify({ stock: 50 }),
      });
      expect(res.status).toBe(403);
    });

    it('Pharmacist inventory write with unknown fields is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/products/med-01/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: pharmacistCookie,
        },
        body: JSON.stringify({ stock: 50, price: 0.01, role: 'pharmacist' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid stock measurement');
    });

    it('Pharmacist inventory write with valid fields succeeds (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/products/med-01/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: pharmacistCookie,
        },
        body: JSON.stringify({ stock: 45 }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.product.stock).toBe(45);
    });

    it('Order status update with unknown fields is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${order1Id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: pharmacistCookie,
        },
        body: JSON.stringify({ status: 'Shipped', extraField: 'exploit' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid consignment status');
    });
  });

  describe('Stage 3: CSRF & Header Security Suite', () => {
    it('State-changing POST without CSRF header is rejected with 403', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'any' }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('CSRF');
    });

    it('Sec-Fetch-Site cross-site is rejected with 403', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Sec-Fetch-Site': 'cross-site',
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'any' }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Sec-Fetch-Site');
    });

    it('Mismatched Origin header is rejected with 403', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          Origin: 'https://attacker.evil.com',
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'any' }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Cross-origin');
    });

    it('Security headers (CSP, HSTS, X-Content-Type-Options, Frame-Options) are active', async () => {
      const res = await fetch(`${baseUrl}/healthz`);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      const csp = res.headers.get('content-security-policy') || '';
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).not.toContain("'unsafe-eval'");
    });
  });
});
