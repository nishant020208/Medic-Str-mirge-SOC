# Production Deployment Guide (Vercel + Supabase)

MediStore: Temple of Asclepius deploys **only on Vercel**, with **Supabase** providing
Postgres (sessions, rate limits, wallet nonces, business data) and Supabase Auth
(Google OAuth). There is no other hosting target, no long-lived process, and no
WebSocket anywhere — the `/terminal` page polls `POST /api/terminal`.

---

## 1. Architecture Overview

```
Browser (client/dist, built by Vite)
  │  GET /*            → Vercel CDN (static SPA, hashed assets immutable)
  │  GET/POST /api/*   → api/index.ts (Vercel Node function, maxDuration 10, region hnd1)
  │  GET /healthz      → api/index.ts
  ▼
api/index.ts ──► server/src/app.ts (Express app, never calls listen())
                   1. mirage.js          ← FIRST middleware (MirageSOC hook)
                   2. morgan / helmet / compression / CORS
                   3. GET /healthz → { status, db, supabase }
                   4. express-session (connect-pg-simple → Supabase pooler)
                   5. json/urlencoded parsers + CSRF header check
                   6. /api rate limiter (Postgres `rate_limits` table)
                   7. routes: auth, products, orders, orders, terminal, oracle
```

- **Stateless:** sessions (`session` table), rate limits (`rate_limits`), wallet
  nonces (`wallet_nonces`) all live in Supabase Postgres. Nothing is kept in
  function memory between invocations.
- **SPA fallback:** every extensionless GET that is not `/api`, not `/healthz`,
  and not a reserved trap path serves `index.html`. The six trap paths
  (`/admin-old`, `/.env`, `/backup.zip`, `/wp-login.php`, `/phpmyadmin`,
  `/api/v1/internal/keys`, case-insensitive, with or without trailing slash)
  are rewritten to the function and answer **404 text/plain**.

---

## 2. Environment Variables

There is exactly **one** template: [`/.env.example`](../.env.example) at the repo
root (all values empty). Locally you maintain exactly **one** secrets file:
`.env.local` at the root (gitignored — Vercel CLI also reads it for `vercel dev`).
The `client/` workspace has **no** env files: `client/vite.config.ts` sets
`envDir: '../'`, so Vite loads the root `.env.local` and inlines `VITE_` vars at
build time.

### 2.1 Server variables — Vercel → Project → Settings → Environment Variables
(Secret. Set for Production, Preview and Development. NEVER prefix with `VITE_`.)

| Key | Required | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | Supabase **session pooler** connection string (Direct connection for local `db:migrate` is fine too). `sslmode=require`. |
| `SUPABASE_URL` | Yes | e.g. `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Public anon key (also needed server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only. **Never** exposed to the client bundle. |
| `SESSION_SECRET` | Yes | `openssl rand -hex 32` |
| `NODE_ENV` | Yes | `production` on Vercel |
| `GEMINI_API_KEY` | Optional | Pythia Oracle; falls back to scripted answers without it |
| `GEMINI_MODEL` | Optional | e.g. `gemini-2.0-flash` |
| `CSP_CONNECT_EXTRA` | Optional | Extra allowed connect origins for the CSP |

### 2.2 Client variables — build-time, inlined into the bundle
(Set in Vercel too; changing one requires a **Redeploy**, not a restart.)

| Key | Required | Notes |
| :--- | :--- | :--- |
| `VITE_WEB3_MODE` | Yes | `mock` (deterministic demo) or `live` |
| `VITE_BATCH_REGISTRY_ADDRESS` | For live mode | Contract address |
| `VITE_SEPOLIA_RPC_URL` | For live mode | RPC endpoint |
| `VITE_TERMINAL_API_URL` | Optional | Empty ⇒ `/terminal` shows **Console offline**. Set to a MirageSOC backend URL to enable polling there. |
| `VITE_SUPABASE_URL` | Yes | Same value as `SUPABASE_URL` (client-exposed copy, used only for the Google OAuth redirect) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Same value as `SUPABASE_ANON_KEY` (client-exposed copy) |

> The **only** client code that talks to Supabase directly is the OAuth step
> (`signInWithOAuth` in `client/src/ui/GoogleSignInButton.tsx` and the token
> exchange in `client/src/pages/AuthCallback.tsx`). Everything else goes through
> the Express API, and `SUPABASE_SERVICE_ROLE_KEY` never appears in a `VITE_`
> variable (verify after each build: `grep -r "service_role" client/dist` → empty).

---

## 3. Vercel Project Setup

1. **Import the repo** at <https://vercel.com/new> (Git provider).
2. Vercel detects Vite + the root `vercel.json`:
   - Build Command: `npm run build`
   - Install Command: `npm ci`
   - Output Directory: `client/dist`
   - Node version comes from `engines.node` (22.x); function region `hnd1`
     (Tokyo — closest Vercel region to the Supabase project in `ap-northeast-2`);
     `maxDuration` 10s on `api/index.ts`.
3. Add **all** variables from §2.1 and §2.2 to Production, Preview and Development.
4. Deploy. The root `vercel.json` is the only one in the repo — do not add
   `client/vercel.json`.
5. Run migrations/seed once against the Supabase pooler (local shell with the
   production `DATABASE_URL`):
   ```bash
   npm ci
   npm run db:migrate   # creates every table (CREATE TABLE IF NOT EXISTS)
   npm run db:seed      # seeds catalogue + the single pharmacist account
   ```
   The app also auto-creates/auto-seeds on first boot if the schema is empty.

---

## 4. Supabase Setup

1. Create a project at <https://supabase.com/dashboard>.
2. **Site URL** (Authentication → URL Configuration) must equal the Vercel
   production URL, e.g. `https://medistore-asclepius.vercel.app`.
3. **Google provider** (Authentication → Sign In / Providers → Google):
   paste the OAuth Client ID + Secret from Google Cloud Console. Authorised
   redirect URI must be exactly:
   ```
   https://nupsyhjouspuoizeuobp.supabase.co/auth/v1/callback
   ```
4. **Email confirmation stays ON** (Authentication → Providers → Email):
   an Express session is only ever created after a confirmed identity.
5. **Database URL** (Project Settings → Database): copy the **Session pooler**
   string into `DATABASE_URL`.
6. **Storage:** create the `product-images` bucket (public read) used by the
   pharmacist dashboard.
7. Run `npm run db:migrate && npm run db:seed`.
8. **RLS:** enable Row Level Security on every table with **no public policies** —
   the browser never talks to Postgres directly; all reads/writes go through the
   Express API using the service-role key server-side.
9. **Accounts:** there is exactly **one** pharmacist account
   (`pharmacist@medistore.test`), created only by `npm run db:seed` (or manually
   in Supabase). No API path can register or promote a pharmacist —
   `POST /api/auth/register` and `POST /api/auth/google-session` always persist
   `role = 'customer'`.

---

## 5. Verification Checklist After Deploy

### 1. Health
```bash
curl -s https://<app>.vercel.app/healthz
# {"status":"ok","db":"ok","supabase":"ok"}
```

### 2. SPA navigation
`https://<app>.vercel.app/shop` must return the built `index.html` (HTTP 200,
`content-type: text/html`), not a 404 and not JSON.

### 3. Security trap paths — all must be HTTP 404, `content-type: text/plain`
```bash
for p in /admin-old /.env /backup.zip /wp-login.php /phpmyadmin /api/v1/internal/keys; do
  printf '%-26s ' "$p"
  curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "https://<app>.vercel.app$p"
done
# every line: 404 text/plain
```

### 4. Cache headers
`/api/*` → `Cache-Control: no-store`; `/assets/*` → `immutable`.

### 5. Authentication
- Email login, wallet login (mock), and **Continue with Google** on `/login`
  and `/register`. Google lands on `/auth/callback`, which exchanges the
  Supabase access token at `POST /api/auth/google-session`, starts the normal
  httpOnly Express session, **discards the browser-side Supabase session**, and
  redirects to `/shop`. Only the Express cookie matters afterwards.
- 11th rapid login attempt → HTTP 429 (Postgres rate limiter).

### 6. Checkout & Oracle
Full browse → cart → checkout → confirmation flow; Oracle answers (Gemini when
`GEMINI_API_KEY` is set, scripted fallback otherwise).

### 7. Terminal
`/terminal` with `VITE_TERMINAL_API_URL` empty shows **Console offline**; with a
backend URL set, each line is a `POST /api/terminal`-style poll (no sockets).

---

## 6. Troubleshooting

- **FUNCTION_INVOCATION_FAILED (500):** check Function logs; almost always a
  missing server env var (the function throws early on missing `DATABASE_URL` /
  `SUPABASE_*` rather than silently degrading in production).
- **Cold starts:** the pool's first connection retries 3× with backoff; keep
  `DATABASE_URL` on the pooler (not a direct connection) so TLS handshakes stay
  under the 10s `maxDuration`.
- **Cookie loss across invocations:** `SESSION_SECRET` must be identical across
  all environments you expect sessions to survive a redeploy in; cookies are
  `httpOnly`, `sameSite=lax`, `secure` in production.
- **Oracle always answers "Scripted":** `GEMINI_API_KEY` missing or rejected —
  the route lazy-imports the Gemini client only when the key is present.
- **Google sign-in fails instantly:** Site URL / redirect URI mismatch — the
  redirect URI must be exactly the `…/auth/v1/callback` URL from §4.3.
- **Local parity:** `npx vercel dev --listen 3000` runs the same rewrite rules
  and reads the same root `.env.local`.

---

## 7. Related Docs

- [`STRUCTURE.md`](./STRUCTURE.md) — folder layout and the invariants that keep it clean
- [`MIRAGE-HOOKS.md`](./MIRAGE-HOOKS.md) — stateless MirageSOC integration contract
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — runtime architecture
- [`../README.md`](../README.md) — overview, quality gates, Lighthouse scores
