# MirageSOC Integration & Hook Specification

This document details the exact integration contracts for wiring **medistore-asclepius** (MediStore: Temple of Asclepius) to its firewall defense layer, **MirageSOC**.

---

## 1. Unified Contract (Identical in Both Repositories)

- **Authentication:** Header `x-api-key: MIRAGE_API_KEY` on `POST {MIRAGE_URL}/api/event` and `GET {MIRAGE_URL}/api/blocklist`.
- **Event Body:**
  ```json
  {
    "ip": "203.0.113.88",
    "userAgent": "Mozilla/5.0 ...",
    "method": "POST",
    "path": "/api/auth/login",
    "kind": "honeytoken",
    "detail": {
      "username": "admin@asclepeion.med",
      "reason": "honeytoken_triggered"
    },
    "fingerprint": "optional-client-fp"
  }
  ```
  **Allowed `kind` Enum (Strictly 12 values):**
  - `trap_hit`
  - `honeytoken`
  - `brute_force`
  - `sqli`
  - `xss`
  - `traversal`
  - `cmdi`
  - `scanner`
  - `flood`
  - `enumeration`
  - `terminal_cmd`
  - `decoy_login`

- **Blocklist Response:**
  ```json
  {
    "ips": ["203.0.113.88", "198.51.100.42"],
    "fingerprints": [],
    "ttl": 3
  }
  ```

- **Reserved Trap Paths (Only these six):**
  - `/admin-old`
  - `/.env`
  - `/backup.zip`
  - `/wp-login.php`
  - `/phpmyadmin`
  - `/api/v1/internal/keys`

- **Client IP Determination:**
  Only Vercel's trusted headers (`x-vercel-forwarded-for` / `x-real-ip`). Client-supplied `x-forwarded-for` headers are ignored when Vercel headers are present, preventing header spoofing attacks.

---

## 2. Middleware Execution Pipeline (`server/mirage.js`)

`mirage` is mounted as the **very first middleware** in `server/src/app.ts` (before static files, helmet, body parsers, and SPA fallback).

### Request Processing Order:
1. **Pass-through Stub Mode:** If `MIRAGE_URL` or `MIRAGE_API_KEY` is unset, `mirage` passes through immediately to `next()`, logging nothing sensitive. Without MirageSOC configured, trap paths fall through to Express 404.
2. **Allowlist Skip:** If caller IP matches any entry in `ALLOWLIST_IPS`, security checks are bypassed.
3. **Blocklist Check:**
   - 3-second module-level cache (`ttl: 3`).
   - 800ms fetch timeout (`AbortSignal.timeout(800)`).
   - **Fail-open:** If MirageSOC is slow, down, or returns non-200, the middleware logs a warning and calls `next()`. The real application remains 100% available.
   - If blocked (IP or fingerprint):
     - `MIRAGE_MODE=enforce` (default): Returns `403` JSON `{"error": "Access blocked"}`.
     - `MIRAGE_MODE=monitor`: Dispatches event to MirageSOC and allows request to proceed.
4. **Trap Path Interception:**
   - Hitting any of the six trap paths dispatches a `trap_hit` event with high severity.
   - Returns a convincing, realistic decoy response (fake admin portal, `.env` with canary AWS tokens, binary ZIP archive with SQL dump, fake WP login, fake phpMyAdmin, or JSON key vault).
5. **Attack Signatures & Structural Checks:**
   - Rejects `TRACE` and `CONNECT` methods (kind: `scanner`).
   - Rejects oversized bodies or headers >100KB (kind: `flood`).
   - Detects scanner User-Agents and empty User-Agents (kind: `scanner`).
   - Detects SQL injection, XSS, path traversal, and command injection signatures in query, URL, and body (kinds: `sqli`, `xss`, `traversal`, `cmdi`).
   - Detects use of planted honeytokens/canary keys anywhere in requests (kind: `honeytoken`).
   - In `enforce` mode, blocks with `403` JSON `{"error": "Access blocked"}`. In `monitor` mode, telemetry is sent while passing through.
6. **Authentication Telemetry:**
   - `loginFailed(req, username)`:
     - Decoy usernames (`admin`, `root`, `test`, `administrator`) trigger instant `decoy_login` events (critical severity, instant block in MirageSOC).
     - Planted honeytoken accounts trigger `honeytoken` events (critical severity).
     - Other credential failures trigger `brute_force` events.
   - `loginSucceeded(req, username)`: Dispatches telemetry to MirageSOC.
7. **Enumeration Probes:**
   - 404 handler in `server/src/app.ts` reports unmatched paths to MirageSOC via `mirage.reportEnumeration(req)`.
   - MirageSOC backend correlates 10 distinct 404s within 60s per IP to enforce automatic blocking.
8. **Fire-and-Forget Reporting:**
   - Dispatches events using `@vercel/functions`'s `waitUntil` without awaiting or delaying client response times.

---

## 3. Stateless Architecture Notes

- MediStore is hosted on Vercel Serverless (`api/index.ts`).
- Function memory is ephemeral and can cold-start or terminate at any time.
- No durable state lives in function memory:
  - User sessions live in Supabase PostgreSQL (`session` table via `connect-pg-simple`).
  - Rate limiting lives in Supabase PostgreSQL (`rate_limits` table).
  - Single-use wallet nonces live in Supabase PostgreSQL (`wallet_nonces` table).
  - Attack correlation and blocklists live in MirageSOC.
- Only a short 3-second best-effort cache for blocklist queries is maintained per function instance to minimize latency while guaranteeing rapid block propagation across edge nodes.
