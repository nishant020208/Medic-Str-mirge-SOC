# MirageSOC Integration & Hook Specification

This document details the exact integration contracts for merging **MirageSOC** (security defense and honeypot firewall layer) into **medistore-asclepius** (MediStore: Temple of Asclepius).

---

## 1. The Stub File (`server/mirage.js`)

In this repository, `server/mirage.js` is a lightweight, zero-overhead pass-through stub.

### Contract & Required Exports:
```javascript
export default function mirage(req, res, next) {
  next();
}

export function loginFailed(req, username) {}
export function loginSucceeded(req, username) {}

mirage.loginFailed = loginFailed;
mirage.loginSucceeded = loginSucceeded;
```

When integrating the actual **MirageSOC** firewall:
> **Replace ONLY `server/mirage.js`.** Do not modify other core routes or middlewares.

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

### 6.2 Blocklist Check: Short Timeout, Per Request, With A Tiny Per-Invocation Cache

Blocklist decisions must come from the MirageSOC backend, queried per request
with an aggressive timeout:

```javascript
// Pseudocode — shape of the real implementation
const BLOCKLIST_TIMEOUT_MS = 150;   // hard ceiling; never block the user for longer
const CACHE_TTL_MS = 5000;          // tiny, per-invocation only (resets on cold start)
let invocationCache = new Map();    // module scope is OK ONLY as a sub-request cache

async function isBlocked(key) {
  const hit = invocationCache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.blocked;

  let blocked = false;
  try {
    const res = await fetch(`${MIRAGE_BACKEND}/blocklist?key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(BLOCKLIST_TIMEOUT_MS),
      headers: { authorization: `Bearer ${MIRAGE_TOKEN}` },
    });
    blocked = res.ok && (await res.json()).blocked === true;
  } catch {
    blocked = false;  // fail open — never let a MirageSOC outage break the store
  }

  invocationCache.set(key, { blocked, at: now });
  if (invocationCache.size > 256) invocationCache.clear(); // bounded, disposable
  return blocked;
}
```

Rules that follow from this:

- The timeout must be **shorter than the remaining `maxDuration` budget** (10 s in
  `vercel.json`). A slow backend must never eat the function's time budget.
- The cache is an optimisation, **never** a source of truth. It is allowed to be
  empty or wrong on a cold start; correctness comes from the per-request call.
- On timeout, DNS failure, 5xx, or malformed JSON: **fail open** and call `next()`.
  A degraded security layer must degrade to pass-through, not to a 500.

### 6.3 Event Reporting: Fire-and-Forget With `waitUntil`

Login hooks and other telemetry must not delay the response. Send them without
awaiting, and hand the promise to `waitUntil` so Vercel keeps the invocation alive
long enough for the report to land after the response has been flushed:

```javascript
import { waitUntil } from '@vercel/functions';

function report(event) {
  const promise = fetch(`${MIRAGE_BACKEND}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(1000),
    headers: { authorization: `Bearer ${MIRAGE_TOKEN}`, 'content-type': 'application/json' },
  }).catch(() => {});           // swallow: reporting must never surface to the user

  waitUntil?.(promise);          // available on Vercel; no-op guard for local dev
}
```

`loginFailed(req, username)` and `loginSucceeded(req, username)` therefore return
**immediately**. They must not be awaited by the auth handlers beyond the call, and
they must not throw: wrap the body in `try/catch` so a MirageSOC bug can never
turn a successful login into a 500.

### 6.4 Never Break the Real App

`mirage(req, res, next)` is the **first** middleware, so a throw inside it aborts
every request before a single route runs. Therefore:

- The entire body must be wrapped so that any failure ends in `next()`, never in a
  thrown error.
- When the backend is down, the correct behaviour is **silently pass through**.
- Trap paths must still be answered as `404 Not found` (plain text) by the app
  itself, so that removing MirageSOC never turns `/admin-old` into a 200 SPA
  response. `server/tests/mirage-hooks.test.ts` and
  `server/tests/serverless.test.ts` lock both properties in place.

### 6.5 What This Means for the Current Stub

`server/mirage.js` today is a pure pass-through that delegates to
`mirage.handler` when one is attached. That already satisfies the statelessness
contract: it stores nothing, times nothing out, and reports nothing. When
MirageSOC replaces the file, the rules above — and the two Vitest suites — are the
acceptance criteria.

---

## 7. Coverage Requirement for the Real Integration

Replacing the stub must keep these Vitest suites green:

- `server/tests/mirage-hooks.test.ts` — proves the stub still runs **first** in
  the middleware chain (before body parsing, before rate limiting).
- `server/tests/serverless.test.ts` — proves the **Vercel handler** itself returns
  `404` for `/admin-old`, `/.env`, `/backup.zip`, `/wp-login.php`, `/phpmyadmin`
  and `/api/v1/internal/keys`, with the Mirage middleware having run.
