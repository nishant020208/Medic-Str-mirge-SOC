# MirageSOC Integration & Hook Specification

This document details the exact integration contracts for merging **MirageSOC** (security defense and honeypot firewall layer) into **medistore-asclepius** (MediStore: Temple of Asclepius).

---

## 1. The MirageSOC Middleware (`server/mirage.js`)

In this repository, `server/mirage.js` is fully connected to the live MirageSOC backend (`https://mirage-soc.vercel.app`), providing real-time telemetry, canary trap monitoring, IP blocklist enforcement, and fail-open resilience.

### Contract & Required Exports:
```javascript
export default async function mirage(req, res, next) {
  // 1. IP Blocklist check via GET /api/blocklist (fails open on timeout/5xx)
  // 2. Trap path detection (fires POST /api/event for reserved trap paths)
  // 3. Attack signature detection (SQLi, XSS, Scanner UAs)
  // 4. Calls next() unless IP is blocked (403 Forbidden)
}

export function loginFailed(req, username) {
  // Fires POST /api/event (critical severity for honeytokens, fire-and-forget)
}

export function loginSucceeded(req, username) {
  // Fires POST /api/event (info severity, fire-and-forget)
}

mirage.loginFailed = loginFailed;
mirage.loginSucceeded = loginSucceeded;
```

---

## 2. Mounting Location in `server/src/app.ts`

To ensure MirageSOC can inspect, fingerprint, and intercept malicious requests before any framework or route handler touches them, the stub is mounted as the **very first middleware** in `server/src/app.ts`:

```typescript
// Rule 2: Trust proxy must be true for accurate client IP identification on Vercel
app.set('trust proxy', true);

// Rule 2: Mirage MUST be the FIRST middleware mounted
app.use(mirage);

// Subsequent middlewares: health check, morgan, helmet, compression, cors, session, parsers, routes...
```

### Why Mirage Must Be First:
1. **Raw Request Preservation:** It intercepts headers, malicious payloads, and reconnaissance probes before Express body parsers, cookie serializers, or rate limiters modify or reject them.
2. **Honeypot Trap Routing:** Synthetic trap endpoints (such as `/.env`, `/admin-old`, `/wp-login.php`, `/phpmyadmin`) must be handled by MirageSOC before the SPA fallback or 404 handler can answer.

---

## 3. Login Instrumentation Hooks

Every authentication handler (both traditional email/passphrase and Web3 Ethereum wallet signatures) explicitly notifies Mirage:

- **Email Login Failure:**
  `mirage.loginFailed(req, email)`
- **Email Login Success:**
  `mirage.loginSucceeded(req, email)`
- **Web3 Wallet Login Failure:**
  `mirage.loginFailed(req, address.toLowerCase())`
- **Web3 Wallet Login Success:**
  `mirage.loginSucceeded(req, address.toLowerCase())`

This enables MirageSOC to correlate credential stuffing, brute-force attempts, and wallet signature spoofing in real-time.

---

## 4. SPA Fallback Restrictions (Preserving Traps)

In `server/src/index.ts`, the SPA fallback is strictly configured to **never** swallow potential trap routes:

```typescript
app.get('*', (req, res, next) => {
  // If path starts with /api or contains a file extension (.env, .zip, .php, etc.), pass to next()
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});
```

Neither `/admin-old` nor `/.env` or other trap paths are handled by the client application. They are intentionally left unhandled so MirageSOC can trigger deception traps.

---

## 5. Robots.txt and HTML Comments

- `public/robots.txt` explicitly disallows:
  ```
  User-agent: *
  Disallow: /admin-old
  Allow: /
  ```
- `index.html` contains the deliberate canary comment:
  ```html
  <!-- TODO remove old admin panel at /admin-old before launch -->
  ```
This attracts automated web crawlers and adversaries directly into the MirageSOC deception web.

---

## 6. Running on Vercel: Statelessness Contract

The production deployment runs the API as a Vercel Node.js serverless function
(`api/index.ts` -> `server/src/app.ts`). Function instances are ephemeral, are not
guaranteed to be the same instance for two consecutive requests, and are frozen
between invocations. The real MirageSOC middleware **must therefore keep no state
in function memory**.

### 6.1 Forbidden: In-Memory State

The middleware must not keep any of the following in module scope or a `Map`/`Set`
declared at module scope:

- A **blocklist / denylist** of IPs, user agents, or paths.
- **Counters** for rate decisions, hit tallies, or "seen this IP" logic.
- **Session or correlation state** used to link a login hook to the request that
  triggered it.
- Any long-lived cache that assumes a warm instance.

Any of the above would silently reset on every cold start, so a blocked attacker
would be admitted the next time a fresh instance served the request. The only
place durable state may live is the MirageSOC backend or Postgres.

### 6.2 Blocklist Check: GET /api/blocklist

Blocklist decisions are queried dynamically per request with a strict timeout (800ms) and per-invocation caching (stored directly on `req._mirageBlocked` so no state leaks between requests):

- **Endpoint:** `GET https://mirage-soc.vercel.app/api/blocklist`
- **Headers:** `x-api-key: MIRAGE_API_KEY`
- **Timeout:** 800ms (`AbortSignal.timeout(800)`)
- **Accepted Response Shapes:**
  - `string[]` (e.g. `["203.0.113.88", "198.51.100.42"]`)
  - `{ ips: string[] }` or `{ blocked: string[] }` or `{ blocklist: string[] }`
  - `{ blocked: boolean }`
- **Enforcement:**
  - If caller's IP matches: immediate `403 Forbidden` (`text/plain`). `next()` is NOT called.
  - **FAIL OPEN:** On timeout, network failure, 5xx, or malformed payload, MediStore logs a notice and calls `next()`. MediStore NEVER returns 500 or fails because MirageSOC is slow or down.

### 6.3 Event Telemetry: POST /api/event

Telemetry events (canary trap hits, reconnaissance scans, SQLi/XSS signatures, failed logins, and honeytoken triggers) are dispatched asynchronously to MirageSOC:

- **Endpoint:** `POST https://mirage-soc.vercel.app/api/event`
- **Headers:** `x-api-key: MIRAGE_API_KEY`, `content-type: application/json`
- **Fire-and-Forget:** Handled via `@vercel/functions`'s `waitUntil` without awaiting or delaying client response times. Errors are caught and swallowed.
- **Payload Shape:**
  ```json
  {
    "ip": "203.0.113.42",
    "user_agent": "Mozilla/5.0 ...",
    "method": "GET",
    "path": "/admin-old",
    "kind": "trap_hit",
    "detail": {
      "path": "/admin-old",
      "reason": "reserved_trap_path"
    },
    "severity": "high"
  }
  ```
- **Event Kinds & Severities:**
  - Reserved trap hit (`/admin-old`, `/.env`, etc.): `kind: 'trap_hit'`, `severity: 'high'`
  - Scanner user-agent: `kind: 'scanner'`, `severity: 'medium'`
  - SQL injection signature: `kind: 'sqli'`, `severity: 'high'`
  - XSS signature: `kind: 'xss'`, `severity: 'medium'`
  - Honeytoken login (`admin@asclepeion.med`, `root`, etc.): `kind: 'honeytoken_triggered'`, `severity: 'critical'`
  - Failed normal login: `kind: 'login_failed'`, `severity: 'low'`
  - Successful login: `kind: 'login_succeeded'`, `severity: 'info'`

### 6.4 Terminal Endpoint: /api/terminal

The Oracle Administrative Console (`/terminal`) connects to MirageSOC via `VITE_TERMINAL_API_URL`:
- **Endpoint:** `POST https://mirage-soc.vercel.app/api/terminal`
- **Payload:** `{ cmd: string, history: string[] }`
- **Resilience:** If the endpoint is down, slow, or returning 404/5xx, `Terminal.tsx` catches the failure and displays a graceful offline/disconnected notice in the console screen without crashing or showing a blank page.

### 6.5 Fail-Open Guarantee

Because `mirage` is the first middleware in the pipeline:
1. Every code path is wrapped in `try/catch` and defaults to `next()`.
2. Outages in MirageSOC degrade MediStore to standard operation without performance penalties.
3. Canary endpoints (`/admin-old`, `/.env`, etc.) are answered by the application's 404 handler (`404 Not found` plain text).

---

## 7. Verification & Resilience Test Suites

The integration is verified by comprehensive Vitest test suites:

- `server/tests/mirage-resilience.test.ts`:
  1. Unreachable MirageSOC (connection refused/timeout) fails open across all routes.
  2. MirageSOC 500 error or malformed HTML/JSON payload fails open.
  3. Blocklisted IP receives immediate 403 Forbidden (plain text).
  4. Hitting `/admin-old` dispatches a `trap_hit` event and returns 404 plain text.
  5. Honeytoken login (`admin@asclepeion.med`) dispatches a `critical` event.
  6. Zero unhandled promise rejections occur under network faults.
- `server/tests/mirage-hooks.test.ts`: Proves middleware mounting order and login hook invocations.
- `server/tests/serverless.test.ts`: Verifies stateless serverless operation on Vercel.
