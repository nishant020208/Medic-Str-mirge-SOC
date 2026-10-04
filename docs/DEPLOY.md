# Production Deployment Guide (Vercel Serverless)

This guide walks through deploying **medistore-asclepius** (MediStore: Temple of Asclepius) as a unified serverless application on [Vercel](https://vercel.com).

---

## 1. Architecture Overview

The repository deploys as a single Vercel project:
- **Client (SPA):** Static assets compiled from `client/` to `client/dist`, served by the Vercel Edge CDN with immutable cache headers.
- **Serverless API:** The Express API backend in `server/` is exposed via `api/index.ts` under Node.js 20.
- **Stateless Persistence:** Backed by Neon PostgreSQL for session state (`session`), rate limiting (`rate_limits`), wallet nonces (`wallet_nonces`), and audit logs (`oracle_logs`).

---

## 2. Environment Variables Configuration

Configure the following variables in **Project Settings > Environment Variables** on Vercel:

### Serverless Runtime Variables (Never prefixed with VITE_)

| Variable Name | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes (Prod) | Neon Pooled PostgreSQL connection string | `postgresql://user:pass@ep-cool-pooler.us-east-1.neon.tech/neondb?sslmode=require` |
| `SESSION_SECRET` | Yes | 64+ char random hex string for signing session cookies | `9f3c7b...` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for Pythia Oracle responses | `AIzaSy...` |
| `GEMINI_MODEL` | Optional | Gemini model name (default: `gemini-2.5-flash`) | `gemini-2.5-flash` |
| `NODE_ENV` | Yes | Node environment | `production` |

### Client Build Variables (VITE_ prefix exposed to browser bundle)

| Variable Name | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | No | Leave empty for same-domain serverless routing | `""` |
| `VITE_WEB3_MODE` | No | Web3 network mode (`mock` or `live`) | `mock` |
| `VITE_SEPOLIA_RPC_URL` | Optional | Infura/Alchemy Sepolia RPC endpoint | `https://sepolia.infura.io/v3/...` |
| `VITE_BATCH_REGISTRY_ADDRESS` | Optional | Deployed batch verification contract address | `0x1234...` |
| `VITE_TERMINAL_WS_URL` | Optional | WebSocket server endpoint for terminal console | `wss://...` |

> [!CAUTION]
> **Secrets Security:** Never prefix `DATABASE_URL`, `SESSION_SECRET`, or `GEMINI_API_KEY` with `VITE_`. VITE_ variables are baked into client JS chunks at build time.

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

3. **Add Environment Variables:**
   - Add `DATABASE_URL`, `SESSION_SECRET`, `GEMINI_API_KEY`, and `NODE_ENV=production`.
   - Add client variables if customizing Web3 RPC or WebSocket channels.

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

---

## 5. Troubleshooting & Operations

### FUNCTION_INVOCATION_FAILED (Status 500)
- Inspect the function runtime log in **Vercel Dashboard > Logs**.
- Check if `DATABASE_URL` is set and accessible.
- Verify that `SESSION_SECRET` is defined.

### Neon Cold Starts & Latency
- Ensure you are using the **Pooled** connection string from Neon (contains `-pooler` in the host).
- Asclepius includes an automatic 3-attempt backoff retry loop to absorb Neon wake-up pauses without dropping user requests.

### Cookie Loss / Session Drops Across Invocations
- Confirm `connect-pg-simple` has created the `session` table in Neon.
- In Vercel serverless, multiple concurrent lambda instances share session data exclusively via the database.
- Ensure `trust proxy` is set to `true` (already configured in `server/src/app.ts`) so Express respects Vercel HTTPS reverse-proxy headers.

### Function Duration Limits (Vercel Hobby Tier)
- Hobby plans enforce a 10-second function execution limit.
- Asclepius caps all outbound Gemini and database queries at 6 seconds with `AbortSignal.timeout(6000)` to guarantee responses before the 10-second ceiling.
