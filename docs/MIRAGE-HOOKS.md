# MirageSOC Integration & Hook Specification

This document details the exact integration contracts for merging **MirageSOC** (security defense and honeypot firewall layer) into **MediStore: Temple of Asclepius**.

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

## 2. Mounting Location in `server/src/index.ts`

To ensure MirageSOC can inspect, fingerprint, and intercept malicious requests before any framework or route handler touches them, the stub is mounted as the **very first middleware**:

```typescript
// Rule 2: Trust proxy must be true for accurate client IP identification
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
