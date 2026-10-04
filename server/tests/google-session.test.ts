import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';

// ---------------------------------------------------------------------------
// Mock the server-side Supabase admin client — no network, no real tokens.
// ---------------------------------------------------------------------------
const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));

vi.mock('../src/lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: (token: string) => mockGetUser(token) as Promise<any>,
    },
  }),
  checkSupabaseHealth: async () => 'ok' as const,
}));

import { app } from '../src/app.js';
import { store } from '../src/data/store.js';

let server: http.Server;
let baseUrl: string;

const GOOGLE_USER = {
  id: 'sb-google-0001',
  email: 'oauth.dev@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'google' },
  user_metadata: { email_verified: true },
};

function validTokenBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: GOOGLE_USER.id,
    email: GOOGLE_USER.email,
    access_token: 'valid-sb-access-token-0123456789',
    ...overrides,
  });
}

async function postGoogleSession(
  body: string,
  ip: string,
  headers: Record<string, string> = {}
) {
  return fetch(`${baseUrl}/api/auth/google-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Forwarded-For': ip,
      ...headers,
    },
    body,
  });
}

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

beforeEach(() => {
  mockGetUser.mockReset();
});

describe('POST /api/auth/google-session', () => {
  it('1. Valid Supabase token creates a customer profile and an Express session', async () => {
    mockGetUser.mockImplementation(async (token: string) => {
      expect(token).toBe('valid-sb-access-token-0123456789');
      return { data: { user: GOOGLE_USER }, error: null };
    });

    const res = await postGoogleSession(validTokenBody(), '198.51.100.20');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.email).toBe(GOOGLE_USER.email);
    expect(body.user.role).toBe('customer');

    // Profile row exists with role=customer
    const user = await store.findUserByEmail(GOOGLE_USER.email);
    expect(user).toBeTruthy();
    expect(user!.role).toBe('customer');

    // Normal httpOnly Express session cookie was issued
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toBeTruthy();
    expect(cookie!.toLowerCase()).toContain('httponly');

    // Cookie is usable against the standard session endpoint
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie!, 'X-Forwarded-For': '198.51.100.20' },
    });
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe(GOOGLE_USER.email);
    expect(meBody.user.role).toBe('customer');
  });

  it('2. Invalid / expired Supabase token is rejected with 401 and creates nothing', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    });

    const email = 'expired.token@example.com';
    const res = await postGoogleSession(
      validTokenBody({ id: 'sb-google-0002', email, access_token: 'expired-token-0123456789abcdef' }),
      '198.51.100.21'
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or expired/i);

    expect(await store.findUserByEmail(email)).toBeUndefined();
  });

  it('3. Supabase client throws → 401 (no session, no profile)', async () => {
    mockGetUser.mockRejectedValue(new Error('network unreachable'));

    const email = 'network.fail@example.com';
    const res = await postGoogleSession(
      validTokenBody({ id: 'sb-google-0003', email, access_token: 'unreachable-token-0123456789' }),
      '198.51.100.22'
    );
    expect(res.status).toBe(401);
    expect(await store.findUserByEmail(email)).toBeUndefined();
  });

  it('4. Existing user is matched by email, not duplicated', async () => {
    // customer@medistore.test already exists from the seed data
    const before = store.users.filter((u) => u.email === 'customer@medistore.test').length;
    expect(before).toBe(1);

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'sb-google-existing',
          email: 'customer@medistore.test',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          app_metadata: { provider: 'google' },
          user_metadata: {},
        },
      },
      error: null,
    });

    const res = await postGoogleSession(
      validTokenBody({
        id: 'sb-google-existing',
        email: 'customer@medistore.test',
        access_token: 'existing-user-token-0123456789',
      }),
      '198.51.100.23'
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('customer');

    const after = store.users.filter((u) => u.email === 'customer@medistore.test').length;
    expect(after).toBe(1);
  });

  it('5. Role is ALWAYS customer — a role:pharmacist payload cannot escalate', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'sb-google-0005',
          email: 'sneaky.escalator@example.com',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          app_metadata: { provider: 'google' },
          user_metadata: {},
        },
      },
      error: null,
    });

    const res = await postGoogleSession(
      validTokenBody({
        id: 'sb-google-0005',
        email: 'sneaky.escalator@example.com',
        access_token: 'escalation-attempt-token-01234567',
        role: 'pharmacist', // must be ignored
      }),
      '198.51.100.24'
    );
    expect(res.status).toBe(200);

    const user = await store.findUserByEmail('sneaky.escalator@example.com');
    expect(user).toBeTruthy();
    expect(user!.role).toBe('customer');
  });

  it('6. Token identity mismatch (claimed email ≠ verified email) → 401', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'sb-google-0006',
          email: 'real.victim@example.com',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          app_metadata: { provider: 'google' },
          user_metadata: {},
        },
      },
      error: null,
    });

    const res = await postGoogleSession(
      validTokenBody({
        id: 'sb-google-0006',
        email: 'attacker.claims.victim@example.com',
        access_token: 'mismatched-identity-token-01234567',
      }),
      '198.51.100.25'
    );
    expect(res.status).toBe(401);
    expect(await store.findUserByEmail('attacker.claims.victim@example.com')).toBeUndefined();
  });

  it('7. Unconfirmed email is rejected with 403 before any session exists', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'sb-google-0007',
          email: 'unconfirmed@example.com',
          email_confirmed_at: null,
          confirmed_at: null,
          app_metadata: { provider: 'password' },
          user_metadata: { email_verified: false },
        },
      },
      error: null,
    });

    const res = await postGoogleSession(
      validTokenBody({
        id: 'sb-google-0007',
        email: 'unconfirmed@example.com',
        access_token: 'unconfirmed-email-token-0123456789',
      }),
      '198.51.100.26'
    );
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(await store.findUserByEmail('unconfirmed@example.com')).toBeUndefined();
  });

  it('8. Malformed payload → 400', async () => {
    const res = await postGoogleSession(JSON.stringify({ id: 'x' }), '198.51.100.27');
    expect(res.status).toBe(400);
  });

  it('9. POST /api/auth/register ignores role:pharmacist (always customer)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Forwarded-For': '198.51.100.28',
      },
      body: JSON.stringify({
        email: 'wannabe.pharmacist@example.com',
        password: 'SacredPass123',
        role: 'pharmacist',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.role).toBe('customer');

    const user = await store.findUserByEmail('wannabe.pharmacist@example.com');
    expect(user!.role).toBe('customer');

    // The seeded pharmacist remains the ONLY pharmacist account
    const pharmacists = store.users.filter((u) => u.role === 'pharmacist');
    expect(pharmacists.map((u) => u.email)).toEqual(['pharmacist@medistore.test']);
  });
});
