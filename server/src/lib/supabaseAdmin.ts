import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase admin client (service-role key).
 *
 * This is the ONLY place the service-role key is read. It is never bundled
 * into client code — the browser only ever sees VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY for the OAuth redirect step.
 *
 * Lazy singleton: created on first use so cold-start module evaluation stays
 * cheap and missing env vars fail loudly at call time, not at import time.
 */
let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      '[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured (Vercel env vars).'
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}

/**
 * Fast health probe for GET /healthz → `{ status, db, supabase }`.
 * Uses the anon key when available so the service-role key is not spent on
 * liveness checks; hard 2s budget so healthz can never hang a request.
 */
export async function checkSupabaseHealth(): Promise<'ok' | 'down'> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 'down';

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: key },
      signal: AbortSignal.timeout(2000),
    });
    return res.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}
