# Production Deployment Guide (Vercel Serverless)

This guide walks through deploying **medistore-asclepius** (MediStore: Temple of Asclepius) as a unified serverless application on [Vercel](https://vercel.com).

---

## 1. Architecture Overview

The repository deploys as a single Vercel project:
- **Client (SPA):** Static assets compiled from `client/` to `client/dist`, served by the Vercel Edge CDN with immutable cache headers.
- **Serverless API:** The Express API backend in `server/` is exposed via `api/index.ts` under Node.js 22 (pinned by `engines.node` in the root `package.json`; Vercel takes the function runtime from `engines` or Project Settings — never from a `functions.*.runtime` key, which is reserved for community runtimes and fails the build otherwise).
- **Stateless Persistence:** Backed by Neon PostgreSQL for session state (`session`), rate limiting (`rate_limits`), wallet nonces (`wallet_nonces`), and audit logs (`oracle_logs`).

---

## 2. Environment Variables Configuration

Configure everything in **Project Settings > Environment Variables**. Vercel scopes each
variable to one or more of three environments: **Production**, **Preview** (every branch
that is not `main`), and **Development** (`vercel dev` on your machine). A variable that is
not scoped to an environment is simply **not defined** when that environment runs.

### 2.1 Where each variable goes

| Variable | Scope | Where it goes | Production | Preview | Development |
|---|---|---|---|---|---|
| `DATABASE_URL` | Server | Normal Environment Variable | Required | Required | Required (local `.env`) |
| `SESSION_SECRET` | Server | Normal Environment Variable | Required | Required | Required (local `.env`) |
| `GEMINI_API_KEY` | Server | Normal Environment Variable | Recommended | Recommended | Optional (falls back to scripted Oracle) |
| `GEMINI_MODEL` | Server | Normal Environment Variable | `gemini-2.5-flash` | `gemini-2.5-flash` | `gemini-2.5-flash` |
| `NODE_ENV` | Server | Normal Environment Variable | `production` | `production` | `development` |
| `CSP_CONNECT_EXTRA` | Server | Normal Environment Variable | Optional | Optional | Optional |
| `VITE_WEB3_MODE` | Client | **Build-time** Environment Variable | `mock` | `mock` | `mock` |
| `VITE_BATCH_REGISTRY_ADDRESS` | Client | **Build-time** Environment Variable | Optional | Optional | Optional |
| `VITE_SEPOLIA_RPC_URL` | Client | **Build-time** Environment Variable | Optional | Optional | Optional |
| `VITE_TERMINAL_WS_URL` | Client | **Build-time** Environment Variable | Optional | Optional | Optional |

**Server variables** (everything without the `VITE_` prefix) are read at *runtime* inside
the Node function. Setting one for Preview is what lets a preview deployment authenticate
against Neon instead of silently degrading to the in-memory store.

**Client variables** (the `VITE_` prefix) are **inlined into the JavaScript bundle at build
time** by Vite, not read at runtime. Two consequences that matter in practice:

- Changing a `VITE_*` value does **not** restart a running function — you must redeploy for
  the new value to reach the browser. Use **Redeploy** on the deployment, not just Restart.
- Because they are inlined, a `VITE_*` value is **public**. Never put a secret behind it.

Leave every optional variable **empty** rather than deleting it; an empty string is treated
as "not configured" by the code paths that read them.

### 2.2 Server variables (never prefixed with `VITE_`)

| Variable Name | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | Neon **Pooled** PostgreSQL connection string | `postgresql://user:pass@ep-cool-pooler.us-east-1.neon.tech/neondb?sslmode=require` |
| `SESSION_SECRET` | Yes | 64+ char random hex string for signing session cookies | `9f3c7b...` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for Pythia Oracle responses | `AIzaSy...` |
| `GEMINI_MODEL` | Optional | Gemini model name (default: `gemini-2.5-flash`) | `gemini-2.5-flash` |
| `NODE_ENV` | Yes | Node environment | `production` |
| `CSP_CONNECT_EXTRA` | Optional | Extra space-separated origins appended to `connect-src` (needed for live RPC/WebSocket hosts) | `https://sepolia.infura.io wss://relay.example` |

### 2.3 Client build variables (`VITE_` prefix, inlined into the bundle)

| Variable Name | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | No | Leave empty for same-domain serverless routing | `""` |
| `VITE_WEB3_MODE` | No | Web3 network mode (`mock` or `live`) | `mock` |
| `VITE_SEPOLIA_RPC_URL` | Optional | Infura/Alchemy Sepolia RPC endpoint | `https://sepolia.infura.io/v3/...` |
| `VITE_BATCH_REGISTRY_ADDRESS` | Optional | Deployed batch verification contract address | `0x1234...` |
| `VITE_TERMINAL_WS_URL` | Optional | WebSocket server endpoint for terminal console | `wss://...` |

> [!CAUTION]
> **Secrets Security:** Never prefix `DATABASE_URL`, `SESSION_SECRET`, or `GEMINI_API_KEY` with `VITE_`. VITE_ variables are baked into client JS chunks at build time and are readable by anyone who loads the page.

### 2.4 Local parity

For local work the same values live in a gitignored `.env` at the repository root
(`.env.example` is the template and must stay empty). `vercel dev` reads `.env` as well, so
the local serverless preview and the deployed function take the same configuration path.

---

## 2.5. Local Vercel Parity (`vercel dev`)

`npm run preview:vercel` runs the real Vercel build pipeline locally: it builds the client
to `client/dist` and serves `/api/*` and `/healthz` through the same `api/index.ts`
serverless handler that production uses. That makes it the fastest way to catch a
`FUNCTION_INVOCATION_FAILED` before deploying.

```bash
# 1. Install the CLI (one-time, no global install needed)
npx vercel --version

# 2. Create local secrets from the template
cp .env.example .env    # then fill in DATABASE_URL, SESSION_SECRET, GEMINI_API_KEY

# 3. Run the serverless preview on http://localhost:3000
npm run preview:vercel
```

Verify the same five surfaces through the handler (adjust the host if you changed the port):

```bash
curl -s http://localhost:3000/healthz                                  # {"status":"ok","db":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/login # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/oracle # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/admin-old # 404 (trap path)
```

Login, checkout and the Oracle are browser flows; run them at
`http://localhost:3000/login` with the same credentials as production. `npm run dev` (Vite +
local Express on port 5000) remains the fast inner loop; `npm run preview:vercel` is the
parity check that mirrors production.

---

## 3. Step-by-Step Deployment Steps

1. **Import Repository:**
   - Log in to your Vercel Dashboard.
   - Click **Add New...** > **Project**.
   - Select and import the `Medic-Str-mirge-SOC` repository.

2. **Project Build Settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `client/dist`
   - **Install Command:** `npm install`

3. **Add Environment Variables** (see section 2 for the full table):
   - **Server variables** (`DATABASE_URL`, `SESSION_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `NODE_ENV=production`, `CSP_CONNECT_EXTRA`) as **normal** Environment Variables.
   - **Client variables** (`VITE_WEB3_MODE`, `VITE_BATCH_REGISTRY_ADDRESS`, `VITE_SEPOLIA_RPC_URL`, `VITE_TERMINAL_WS_URL`) — Vite inlines these at build time, so treat them as build-time values and **Redeploy** (not Restart) after changing one.
   - Tick **Production**, **Preview** and **Development** for each variable. A variable scoped only to Production is simply undefined on preview deployments, and preview requests then fall back to the in-memory store and an unverified Oracle.

4. **Deploy:**
   - Click **Deploy**. Vercel will install dependencies across root workspaces, build the client bundle, compile TypeScript, and wire serverless routes.

---

## 4. Verification Checklist After Deployment

Run these checks against your production deployment URL (e.g. `https://your-domain.vercel.app`):

### 1. Health & Database Check
```bash
curl -s https://your-domain.vercel.app/healthz
# Expected output:
# {"status":"ok","db":"ok"}
```

### 2. Client Single Page Application Navigation
- Open `https://your-domain.vercel.app` in your browser.
- Navigate to `/shop`, `/oracle`, `/dashboard`, and `/register`.
- Reload `/register` directly in the browser address bar — verify it displays the page without a 404 error.

### 3. Security Trap Paths (Must return 404 plain text)
Verify that security trap paths return HTTP 404 rather than the HTML index page:
```bash
curl -I https://your-domain.vercel.app/admin-old
curl -I https://your-domain.vercel.app/.env
curl -I https://your-domain.vercel.app/backup.zip
curl -I https://your-domain.vercel.app/wp-login.php
curl -I https://your-domain.vercel.app/phpmyadmin
curl -I https://your-domain.vercel.app/api/v1/internal/keys
# All must return HTTP/2 404 with content-type: text/plain
```

### 4. Authentication Verification
- Log in at `/login` with credentials `pharmacist@medistore.test` / `Demo@12345`.
- Verify the session cookie is saved with `HttpOnly; Secure; SameSite=Lax`.

### 5. Checkout Flow
- Add any product to the cart, open `/checkout`, submit the demo form, and confirm you land on
  `/order-confirmation/ORD-...` showing **“Consecration Confirmed”** plus the batch ID.
- A confirmation page that renders “not found” means the `POST /api/orders` and the following
  `GET /api/orders/:id` hit different database states — check `/healthz` reports `db:"ok"`.

### 6. Pythia Oracle
- Open `/oracle` and submit a question.
- Expect an answer **and** an `AI` or `Scripted` badge. `Scripted` means Gemini was
  unreachable or errored and the scripted fallback answered — functional, but investigate
  `GEMINI_API_KEY` if you expected AI answers.

### 7. Theme Switch
- Use the theme control in the header and cycle all three themes.
- Each switch must re-theme the page with no full reload and no console error. Themes are
  applied client-side, so a failure here is a bundle problem, not an environment variable.

---

## 5. Troubleshooting & Operations

### FUNCTION_INVOCATION_FAILED (Status 500)
This is Vercel's generic "the function threw before it answered" wrapper. It carries no
diagnostic of its own, so work from the real stack trace:

1. **Open the Logs tab** and open the failing invocation. The actual JavaScript error is at
   the bottom of the log, under the invocation ID.
2. **Missing env var.** The usual cause on a first deploy is an undefined variable. The log
   says so directly, e.g. `DATABASE_URL is required` or `SESSION_SECRET is required`. The
   error is raised on a cold start, which is why it often surfaces on the first request
   after a deploy and not afterwards.
3. **`DATABASE_URL` format.** It must be a full URL, and for serverless it must be the Neon
   **pooled** endpoint (`...-pooler.<region>.neon.tech/neondb?sslmode=require`). A direct
   (non-pooled) host will exhaust connections under concurrent functions; a missing
   `?sslmode=require` fails the TLS handshake; a URL with a literal newline or surrounding
   quotes (common when pasted from the Neon dashboard) fails to parse.
4. **Tables not migrated.** Run the migration against the *same* database that
   `DATABASE_URL` points at, so `session`, `rate_limits`, `wallet_nonces` and
   `oracle_logs` exist. A missing `session` table surfaces as an error from
   `connect-pg-simple` on the first request that touches the session middleware.
5. **Unusable geometry:** the function must be Node 22 (`engines.node: "22.x"` in the root `package.json`, or Project Settings > Node.js Version), region `iad1`, and
   `maxDuration: 10` as configured in `vercel.json`. Do **not** add a `functions.*.runtime`
   key to `vercel.json` — that field is only for community runtimes in `name@version`
   format (e.g. `now-php@1.0.0`) and any other value aborts the build with
   `Function Runtimes must have a valid version`. Check that an edit to `vercel.json`
   actually reached the deployment — Vercel reads it at build time.
6. **Reproduce locally before redeploying:** `npm run preview:vercel` runs the same handler,
   so the same stack trace appears in your terminal without any dashboard round-trip.

### Neon Cold Starts & Latency
- Ensure you are using the **Pooled** connection string from Neon (contains `-pooler` in the host).
- Asclepius includes an automatic 3-attempt backoff retry loop to absorb Neon wake-up pauses without dropping user requests.
- The database pool attaches an `error` listener, so an idle client dropped by the Neon
  pooler is logged as a warning instead of throwing an unhandled `'error'` event and
  killing the invocation. If you see `pool.on('error')` warnings in the logs, they are
  harmless reconnect churn, not failures.
- First requests after a long idle period can take several seconds while the function
  initialises and the connection warms. `GET /healthz` is the cheapest way to warm it.
- `regions: ["iad1"]` is chosen to sit close to the Neon region. If your Neon database is
  not in `us-east`, change `regions` in `vercel.json` to match, otherwise every request pays
  a cross-region round trip inside a 10-second budget.

### Cookie Loss / Session Drops Across Invocations
- Confirm `connect-pg-simple` has created the `session` table in Neon.
- In Vercel serverless, multiple concurrent lambda instances share session data exclusively via the database.
- Ensure `trust proxy` is set to `true` (already configured in `server/src/app.ts`) so Express respects Vercel HTTPS reverse-proxy headers.
- With `trust proxy` on, the client IP comes from `X-Forwarded-For`. If the rate-limit key
  collapses to one shared bucket you will see unexpected `429`s; check the proxy header is
  actually reaching the function (it should be set by the Vercel edge, not by the client).
- A session that survives a login but not a reload almost always means the `session` table
  is missing or unreachable — the cookie is signed with `SESSION_SECRET`, so confirm every
  environment uses the *same* `SESSION_SECRET` value.

### Oracle Always Answers "Scripted"
- The Oracle falls back to scripted answers on any Gemini error, by design, and never
  surfaces the raw error.
- Check `GEMINI_API_KEY` is set for the environment that served the request, and that
  `GEMINI_MODEL` is a model the key has access to. A 403 from Google is an entitlement
  problem, not a code problem.

### Function Duration Limits (Vercel Hobby Tier)
- Hobby plans enforce a 10-second function execution limit.
- Asclepius caps all outbound Gemini and database queries at 6 seconds with `AbortSignal.timeout(6000)` to guarantee responses before the 10-second ceiling.
- **Check the current limits before you rely on them.** Vercel changes plan limits without
  notice, so confirm against the live documentation at
  <https://vercel.com/docs/limits> (function duration) and
  <https://vercel.com/docs/plan-limits> (plan terms) rather than trusting the numbers
  quoted here. This guide sets `maxDuration: 10` to match the documented Hobby ceiling;
  if the current docs show a different value, change `functions.api/index.ts` in
  `vercel.json` to match, otherwise the build fails with `maxDuration must be less than or
  equal to...`.
- **Hobby is for personal, non-commercial use only.** If this project is for the competition
  or any commercial purpose, a Hobby deployment can be suspended; verify eligibility
  against <https://vercel.com/docs/plans/hobby> before presenting.
