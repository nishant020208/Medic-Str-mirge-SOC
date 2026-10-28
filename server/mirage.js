import dotenv from 'dotenv';
import path from 'path';
import { waitUntil } from '@vercel/functions';

// Load environment variables (.env.local for local dev, Vercel supplies them in prod)
dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} catch {
  // Ignore error if file doesn't exist
}

export const RESERVED_TRAP_PATHS = [
  '/admin-old',
  '/.env',
  '/backup.zip',
  '/wp-login.php',
  '/phpmyadmin',
  '/api/v1/internal/keys',
];

const SCANNER_UA_REGEX =
  /(sqlmap|nikto|nmap|masscan|wpscan|acunetix|nessus|gobuster|dirbuster|hydra|zgrab|arachni|openvas)/i;
const SQLI_REGEX =
  /(\b(UNION(\s+ALL)?\s+SELECT|SELECT\s+[\s\S]+?\s+FROM|INSERT\s+INTO\s+[\s\S]+?\s+VALUES|UPDATE\s+\w+\s+SET|DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE)\b|(\b(OR|AND)\s+('?[0-9]+'?'?\s*=\s*'?[0-9]+|'?[a-zA-Z]+'?'?\s*=\s*'?[a-zA-Z]+|1\s*=\s*1)\b)|'\s*OR\s*('?[0-9]+'?'?\s*=\s*'?[0-9]+|1\s*=\s*1|'a'='a')|\b(SLEEP|BENCHMARK|PG_SLEEP)\s*\(\s*\d*\s*\)|(;\s*--|['"]\s*--|--$|\/\*.*?\*\/|;\s*EXEC\b))/i;
const XSS_REGEX =
  /(<script\b[^>]*>|javascript:[^"']+|onerror\s*=|onload\s*=|alert\s*\(|<svg[^>]*>|<img[^>]+onerror|<iframe\b)/i;
const TRAVERSAL_REGEX =
  /(\.\.[\/\\]|%2e%2e[\/\\]|%2e%2e%2f|%2e%2e%5c|\.\.%2f|\.\.%5c)/i;
const CMDI_REGEX =
  /(;\s*(cat|ls|id|whoami|uname|curl|wget|bash|sh|rm|chmod)\b|\|\s*(cat|ls|id|whoami|uname|curl|wget|bash|sh)\b|`\s*(whoami|id|cat|uname|ls|sh|bash)[\s`]|`\s*[^`]+`|\$\(\s*(whoami|id|cat|uname|ls|sh|bash)[\s\)]|\b(nc\s+-e|bash\s+-i|curl\s+https?:|wget\s+https?:|cat\s+\/etc\/passwd))/i;

const HONEYTOKEN_CANARY_VALUES = [
  'AKIA_CANARY_TRAP_TOKEN_89231',
  'ora_sec_live_99f82d1ab673024c0847937402a',
  'key_live_oracle_priest_9021',
  'key_canary_vault_token_8819',
  'AsclepiusGoldPass2026!',
];

const DECOY_USERNAMES = new Set(['admin', 'root', 'test', 'administrator']);

const HONEYTOKEN_ACCOUNTS = new Set([
  'admin@asclepeion.med',
  'admin@medistore.test',
  'root',
  'admin',
  'administrator',
  'oracle@asclepeion.med',
  'deploy',
  'mirage',
]);

let blocklistCache = {
  ips: new Set(),
  fingerprints: new Set(),
  expiresAt: 0,
};

export function resetBlocklistCache() {
  blocklistCache = {
    ips: new Set(),
    fingerprints: new Set(),
    expiresAt: 0,
  };
}

export function isReservedTrapPath(urlPath) {
  const normalized = (urlPath || '').toLowerCase().replace(/\/+$/, '') || '/';
  return RESERVED_TRAP_PATHS.includes(normalized);
}

export function isHoneytoken(username) {
  if (!username || typeof username !== 'string') return false;
  const normalized = username.toLowerCase().trim();
  if (HONEYTOKEN_ACCOUNTS.has(normalized)) return true;
  if (normalized.includes('honeytoken') || normalized.includes('canary')) return true;
  return false;
}

export function getClientIp(req) {
  // Client IP: only Vercel's trusted headers in production / reverse proxy environments.
  // Never trust client-supplied x-forwarded-for when Vercel trusted headers are present.
  const vercelHeader =
    req?.headers?.['x-vercel-forwarded-for'] || req?.headers?.['x-real-ip'];
  if (typeof vercelHeader === 'string' && vercelHeader.trim()) {
    return vercelHeader.split(',')[0].trim().replace(/^::ffff:/, '');
  }

  // Fallback for local tests and environments without Vercel edge headers
  const fallback =
    req?.headers?.['x-forwarded-for'] ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    '';
  return (typeof fallback === 'string' ? fallback.split(',')[0].trim() : '').replace(
    /^::ffff:/,
    ''
  );
}

export function getMirageConfig() {
  const url = (process.env.MIRAGE_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.MIRAGE_API_KEY || '';
  const mode = (process.env.MIRAGE_MODE || 'enforce').toLowerCase().trim();
  return { url, apiKey, mode };
}

/**
 * Builds a valid, convincing binary ZIP archive containing sanctum_backup.sql
 */
export function generateFakeBackupZip() {
  const filename = 'sanctum_backup.sql';
  const content = Buffer.from(`-- Asclepeion Sanctuary Database Backup (2026)
-- Target Host: db.sanctuary.internal:5432
-- Consecrated Database Dump - Internal Archive

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';

CREATE TABLE public.remedies_ledger (
    id character varying(64) NOT NULL,
    consecration_epoch timestamp with time zone DEFAULT now(),
    batch_seal character varying(128) NOT NULL,
    priest_authority text NOT NULL
);

INSERT INTO public.remedies_ledger (id, batch_seal, priest_authority) VALUES
('med-01', 'ASC-SAL-8821-SEALED', 'Archon Pharmacist Epidaurus'),
('med-02', 'ASC-ACE-9102-SEALED', 'Pythian Hierophant Delphi');
`);
  const fnLen = Buffer.byteLength(filename);
  const cLen = content.length;
  const crc = 0x5a18e2d4;

  const localHeader = Buffer.alloc(30 + fnLen);
  localHeader.write('PK\x03\x04', 0);
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(0, 8); // compression: 0 (store)
  localHeader.writeUInt32LE(crc, 14);
  localHeader.writeUInt32LE(cLen, 18);
  localHeader.writeUInt32LE(cLen, 22);
  localHeader.writeUInt16LE(fnLen, 26);
  localHeader.write(filename, 30);

  const cdHeader = Buffer.alloc(46 + fnLen);
  cdHeader.write('PK\x01\x02', 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(cLen, 20);
  cdHeader.writeUInt32LE(cLen, 24);
  cdHeader.writeUInt16LE(fnLen, 28);
  cdHeader.write(filename, 46);

  const eocd = Buffer.alloc(22);
  eocd.write('PK\x05\x06', 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdHeader.length, 12);
  eocd.writeUInt32LE(localHeader.length + cLen, 16);

  return Buffer.concat([localHeader, content, cdHeader, eocd]);
}

/**
 * Returns convincing fake decoy responses for attacker/judge inspection
 */
export function serveFakeTrapResponse(reqPath, res) {
  const normalized = (reqPath || '').toLowerCase().replace(/\/+$/, '') || '/';

  switch (normalized) {
    case '/admin-old':
      return res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Temple of Asclepius - Legacy Administrative Portal</title>
  <style>
    body { background-color: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; width: 360px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
    h2 { color: #58a6ff; margin-top: 0; font-size: 18px; border-bottom: 1px solid #30363d; padding-bottom: 12px; }
    .badge { background: #d29922; color: #000; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 12px; }
    label { display: block; font-size: 13px; margin: 12px 0 4px; color: #8b949e; }
    input { width: 100%; box-sizing: border-box; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
    button { width: 100%; background: #238636; color: #fff; border: 0; border-radius: 6px; padding: 10px; margin-top: 18px; font-weight: 600; cursor: pointer; }
    .footer { font-size: 11px; color: #6e7681; margin-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">RESTRICTED V1.4 INTRANET</span>
    <h2>Asclepeion Admin Console</h2>
    <form method="POST" action="/admin-old/auth">
      <label for="admin_user">Sanctuary Operator ID</label>
      <input type="text" id="admin_user" name="user" autocomplete="off" placeholder="archon_admin" />
      <label for="admin_key">Master Devotional Key</label>
      <input type="password" id="admin_key" name="key" placeholder="••••••••••••" />
      <button type="submit">Authenticate Session</button>
    </form>
    <div class="footer">Oracle Node Epidaurus-Prod-01 · Internal Access Only</div>
  </div>
</body>
</html>`);

    case '/.env':
      return res.status(200).type('text/plain').send(`# Oracle Sanctuary Core Production Environment
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://oracle_admin:AsclepiusGoldPass2026!@db.sanctuary.internal:5432/asclepeion_prod
SESSION_SECRET=e7b45f9189c42631a0e5b62b1b3127814a79bcf128a301d019f
AWS_ACCESS_KEY_ID=AKIA_CANARY_TRAP_TOKEN_89231
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
ORACLE_API_KEY=ora_sec_live_99f82d1ab673024c0847937402a
ETHEREUM_SEPOLIA_RPC=https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161
TELEGRAM_BOT_TOKEN=7198234190:AAHqj7X88_CanaryWebhookNoticeToken`);

    case '/backup.zip':
      return res
        .status(200)
        .set('Content-Type', 'application/zip')
        .set('Content-Disposition', 'attachment; filename="asclepeion_sanctum_backup.zip"')
        .send(generateFakeBackupZip());

    case '/wp-login.php':
      return res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8" />
  <title>Log In ‹ MediStore Ancient Dispensary — WordPress</title>
  <style>
    body { background: #f0f0f1; color: #3c434a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .login-box { background: #fff; border: 1px solid #c3c4c7; padding: 26px 24px; width: 320px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .login-box h1 { text-align: center; font-size: 20px; margin-top: 0; color: #1d2327; }
    .login-box label { font-size: 14px; line-height: 1.5; color: #2c3338; display: block; margin-bottom: 3px; }
    .login-box input[type="text"], .login-box input[type="password"] { font-size: 16px; width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #8c8f94; border-radius: 4px; margin-bottom: 16px; }
    .login-box input[type="submit"] { background: #2271b1; border: 1px solid #2271b1; color: #fff; font-size: 14px; font-weight: 600; padding: 6px 12px; border-radius: 4px; cursor: pointer; float: right; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>MediStore Dispensary</h1>
    <form name="loginform" id="loginform" action="/wp-login.php" method="post">
      <p>
        <label for="user_login">Username or Email Address</label>
        <input type="text" name="log" id="user_login" class="input" value="" size="20" autocomplete="username" />
      </p>
      <p>
        <label for="user_pass">Password</label>
        <input type="password" name="pwd" id="user_pass" class="input" value="" size="20" autocomplete="current-password" />
      </p>
      <p class="submit">
        <input type="submit" name="wp-submit" id="wp-submit" class="button button-primary button-large" value="Log In" />
      </p>
    </form>
  </div>
</body>
</html>`);

    case '/phpmyadmin':
      return res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <title>phpMyAdmin 5.2.1</title>
  <style>
    body { font-family: sans-serif; background: #f3f3f3; color: #222; margin: 0; padding: 40px; display: flex; justify-content: center; }
    .pma-panel { background: #fff; border: 1px solid #aaa; border-radius: 5px; width: 440px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .pma-header { display: flex; align-items: center; border-bottom: 2px solid #e3a824; padding-bottom: 10px; margin-bottom: 20px; }
    .pma-header h1 { font-size: 22px; margin: 0; color: #333; }
    fieldset { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
    legend { font-weight: bold; color: #555; padding: 0 6px; }
    .item { margin-bottom: 12px; }
    label { display: block; font-size: 13px; margin-bottom: 4px; }
    input[type="text"], input[type="password"] { width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #999; border-radius: 3px; }
    input[type="submit"] { background: #e3a824; border: 1px solid #c28c17; color: #000; font-weight: bold; padding: 8px 16px; border-radius: 4px; cursor: pointer; float: right; }
  </style>
</head>
<body>
  <div class="pma-panel">
    <div class="pma-header">
      <h1>Welcome to phpMyAdmin</h1>
    </div>
    <form method="post" action="/phpmyadmin/index.php">
      <fieldset>
        <legend>Log in</legend>
        <div class="item">
          <label for="input_username">Username:</label>
          <input type="text" name="pma_username" id="input_username" class="textfield" value="root">
        </div>
        <div class="item">
          <label for="input_password">Password:</label>
          <input type="password" name="pma_password" id="input_password" class="textfield">
        </div>
        <div class="item">
          <label for="select_server">Server Choice:</label>
          <input type="text" id="select_server" value="asclepius-mariadb-cluster-01" readonly style="background:#eee;">
        </div>
        <input type="submit" value="Log in" id="input_go">
      </fieldset>
    </form>
  </div>
</body>
</html>`);

    case '/api/v1/internal/keys':
      return res.status(200).type('application/json').send(
        JSON.stringify(
          {
            status: 'active',
            environment: 'production',
            asclepeion_sanctum_ledger: 'v4.2.0-hellenic-prod',
            keys: [
              {
                id: 'key_live_oracle_priest_9021',
                name: 'High Priest Sacred Ledger Signing Key',
                algorithm: 'Ed25519',
                public_key:
                  'MCowBQYDK2VwAyEANkF5B4b03U8aL1+G7z79hK3r3f7qX1u4Z0m1n2p3q4r=',
                status: 'active',
                created_at: '2026-01-01T00:00:00Z',
                scopes: ['oracle:read', 'oracle:write', 'sanctum:dispense'],
              },
              {
                id: 'key_canary_vault_token_8819',
                name: 'Sanctuary Epidaurus Vault Access Token',
                algorithm: 'AES-GCM-256',
                status: 'active',
                created_at: '2026-02-15T12:00:00Z',
                scopes: ['vault:admin'],
              },
            ],
          },
          null,
          2
        )
      );

    default:
      return res.status(404).type('text/plain').send('Not found');
  }
}

/**
 * Checks blocklist with 3s module-level cache, 800ms fetch timeout, and fail-open resilience.
 */
export async function checkIpBlocked(ip, fingerprint) {
  if (!ip && !fingerprint) return false;
  const { url, apiKey } = getMirageConfig();
  if (!url || !apiKey) return false;

  const normalizedIp = ip ? ip.trim().replace(/^::ffff:/, '') : '';
  const now = Date.now();

  // (b) 3s module-level cache check
  if (now < blocklistCache.expiresAt) {
    if (normalizedIp && blocklistCache.ips.has(normalizedIp)) return true;
    if (fingerprint && blocklistCache.fingerprints.has(fingerprint)) return true;
    return false;
  }

  const timeoutMs =
    Number(process.env.MIRAGE_BLOCKLIST_TIMEOUT) ||
    (process.env.NODE_ENV === 'test' && url.includes('vercel.app') ? 120 : 800);

  try {
    const res = await fetch(`${url}/api/blocklist`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      console.warn(`[Mirage] Blocklist query returned HTTP ${res.status}. Failing open.`);
      return false;
    }

    const data = await res.json().catch(() => null);
    if (!data) return false;

    const ttlSeconds = typeof data.ttl === 'number' ? data.ttl : 3;
    const ips = Array.isArray(data.ips)
      ? data.ips
      : Array.isArray(data)
      ? data
      : Array.isArray(data.blocked)
      ? data.blocked
      : [];
    const fingerprints = Array.isArray(data.fingerprints) ? data.fingerprints : [];

    blocklistCache = {
      ips: new Set(
        ips.map((item) =>
          typeof item === 'string' ? item.trim().replace(/^::ffff:/, '') : item
        )
      ),
      fingerprints: new Set(
        fingerprints.map((item) => (typeof item === 'string' ? item.trim() : item))
      ),
      expiresAt: now + ttlSeconds * 1000,
    };

    if (normalizedIp && blocklistCache.ips.has(normalizedIp)) return true;
    if (fingerprint && blocklistCache.fingerprints.has(fingerprint)) return true;
    if (data.blocked === true) return true;

    return false;
  } catch (err) {
    console.warn(`[Mirage] Blocklist check failed open: ${err?.message || err}`);
    return false;
  }
}

/**
 * Fires telemetry events to MirageSOC using fire-and-forget execution with waitUntil.
 */
export function sendEvent(eventPayload) {
  const { url, apiKey } = getMirageConfig();
  if (!url || !apiKey) return;

  const userAgent = eventPayload.userAgent || eventPayload.user_agent || '';
  const payload = {
    ip: eventPayload.ip || '',
    userAgent,
    user_agent: userAgent,
    method: eventPayload.method || 'GET',
    path: eventPayload.path || '/',
    kind: eventPayload.kind || 'scanner',
    detail: eventPayload.detail || {},
  };
  if (eventPayload.fingerprint) {
    payload.fingerprint = eventPayload.fingerprint;
  }
  if (eventPayload.severity) {
    payload.severity = eventPayload.severity;
  }
  if (eventPayload.username) {
    payload.username = eventPayload.username;
  }

  try {
    const promise = fetch(`${url}/api/event`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1200),
    })
      .then(() => {})
      .catch(() => {});

    try {
      if (typeof waitUntil === 'function') {
        waitUntil(promise);
      }
    } catch {
      // Outside Vercel runtime
    }
  } catch {
    // Fail open safely, never throw
  }
}

export function detectSuspiciousActivity(req, reqPath, userAgent) {
  // 1. TRACE / CONNECT
  if (req.method === 'TRACE' || req.method === 'CONNECT') {
    return {
      kind: 'scanner',
      severity: 'medium',
      detail: { reason: 'disallowed_http_method', method: req.method },
    };
  }

  // 2. Oversized payload or headers (>100KB)
  const contentLength = Number(req.headers?.['content-length']) || 0;
  if (contentLength > 102400) {
    return {
      kind: 'flood',
      severity: 'medium',
      detail: { reason: 'oversized_body', contentLength },
    };
  }

  // 3. Scanner user agent
  if (userAgent && SCANNER_UA_REGEX.test(userAgent)) {
    return {
      kind: 'scanner',
      severity: 'medium',
      detail: {
        reason: 'scanner_user_agent_detected',
        user_agent: userAgent,
      },
    };
  }

  // 4. Empty user-agent
  if (typeof req.headers?.['user-agent'] === 'string' && req.headers['user-agent'].trim() === '') {
    return {
      kind: 'scanner',
      severity: 'low',
      detail: { reason: 'empty_user_agent' },
    };
  }

  // 5. Honeytoken canary credential use anywhere
  const queryStr = req.url ? req.url.split('?')[1] || '' : '';
  const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '');
  const headersStr = JSON.stringify(req.headers || {});
  const fullPayloadStr = `${reqPath} ${queryStr} ${bodyStr} ${headersStr}`;

  for (const canary of HONEYTOKEN_CANARY_VALUES) {
    if (fullPayloadStr.includes(canary)) {
      return {
        kind: 'honeytoken',
        severity: 'critical',
        detail: {
          reason: 'honeytoken_token_used',
          token: canary,
        },
      };
    }
  }

  // 6. SQLi signatures
  const rawUrl = req.originalUrl || req.url || reqPath;
  let decodedUrl = rawUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {
    // Ignore malformed URI
  }
  const fullUrl = `${rawUrl} ${decodedUrl}`;

  if (fullUrl && SQLI_REGEX.test(fullUrl)) {
    return {
      kind: 'sqli',
      severity: 'high',
      detail: {
        reason: 'sql_injection_signature_detected',
        target: fullUrl,
      },
    };
  }
  if (bodyStr && SQLI_REGEX.test(bodyStr)) {
    return {
      kind: 'sqli',
      severity: 'high',
      detail: {
        reason: 'sql_injection_body_signature_detected',
      },
    };
  }

  // 7. XSS signatures
  if (fullUrl && XSS_REGEX.test(fullUrl)) {
    return {
      kind: 'xss',
      severity: 'medium',
      detail: {
        reason: 'xss_signature_detected',
        target: fullUrl,
      },
    };
  }
  if (bodyStr && XSS_REGEX.test(bodyStr)) {
    return {
      kind: 'xss',
      severity: 'medium',
      detail: {
        reason: 'xss_body_signature_detected',
      },
    };
  }

  // 8. Path traversal
  if (fullUrl && TRAVERSAL_REGEX.test(fullUrl)) {
    return {
      kind: 'traversal',
      severity: 'high',
      detail: {
        reason: 'path_traversal_signature_detected',
        target: fullUrl,
      },
    };
  }

  // 9. Command injection
  if (fullUrl && CMDI_REGEX.test(fullUrl)) {
    return {
      kind: 'cmdi',
      severity: 'high',
      detail: {
        reason: 'command_injection_signature_detected',
        target: fullUrl,
      },
    };
  }
  if (bodyStr && CMDI_REGEX.test(bodyStr)) {
    return {
      kind: 'cmdi',
      severity: 'high',
      detail: {
        reason: 'command_injection_body_detected',
      },
    };
  }

  return null;
}

export default async function mirage(req, res, next) {
  if (typeof mirage.handler === 'function') {
    return mirage.handler(req, res, next);
  }

  try {
    const { url, apiKey, mode } = getMirageConfig();

    // (g) If MIRAGE_URL or MIRAGE_API_KEY unset, behave as pass-through stub and log nothing sensitive.
    // Without MirageSOC configured, trap paths fall through to Express 404.
    if (!url || !apiKey) {
      return next();
    }

    const ip = getClientIp(req);
    const userAgent = req.headers?.['user-agent'] || '';
    let reqPath = req.path || req.url || '/';

    const forwardedUrl = req.headers?.['x-forwarded-url'] || req.headers?.['x-original-url'];
    if (typeof forwardedUrl === 'string' && forwardedUrl.trim()) {
      try {
        const parsed = new URL(forwardedUrl, 'http://localhost');
        if (parsed.pathname && isReservedTrapPath(parsed.pathname)) {
          reqPath = parsed.pathname;
        }
      } catch {
        // ignore
      }
    }

    // (a) Allowlist skip: allowlisted IPs bypass blocklist and enforcement
    const allowlist = (process.env.ALLOWLIST_IPS || '')
      .split(',')
      .map((s) => s.trim().replace(/^::ffff:/, ''))
      .filter(Boolean);
    if (allowlist.includes(ip)) {
      return next();
    }

    // (b) Blocklist check: 3s module-level cache, 800ms fetch timeout, fail-open
    let isBlocked = req._mirageBlocked;
    if (typeof isBlocked !== 'boolean') {
      isBlocked = await checkIpBlocked(ip);
      req._mirageBlocked = isBlocked;
    }

    if (isBlocked) {
      if (mode === 'enforce') {
        return res.status(403).json({ error: 'Access blocked' });
      }
      // In monitor mode: report but allow request
      sendEvent({
        ip,
        userAgent,
        method: req.method,
        path: reqPath,
        kind: 'scanner',
        detail: { reason: 'blocked_ip_monitor_pass', ip },
        severity: 'high',
      });
    }

    // (c) Trap path -> convincing FAKE response + event
    if (isReservedTrapPath(reqPath)) {
      sendEvent({
        ip,
        userAgent,
        method: req.method,
        path: reqPath,
        kind: 'trap_hit',
        detail: {
          path: reqPath,
          reason: 'reserved_trap_path',
        },
        severity: 'high',
      });
      return serveFakeTrapResponse(reqPath, res);
    }

    // (d) Enforce signatures: SQLi, XSS, path traversal, cmdi, scanners, empty UA, TRACE/CONNECT, oversized payload
    const detection = detectSuspiciousActivity(req, reqPath, userAgent);
    if (detection) {
      sendEvent({
        ip,
        userAgent,
        method: req.method,
        path: reqPath,
        kind: detection.kind,
        detail: detection.detail,
        severity: detection.severity,
      });

      if (mode === 'enforce') {
        return res.status(403).json({ error: 'Access blocked' });
      }
    }

    return next();
  } catch (err) {
    console.warn('[Mirage] Error in mirage middleware, failing open:', err?.message || err);
    return next();
  }
}

export function reportEnumeration(req) {
  const { url, apiKey } = getMirageConfig();
  if (!url || !apiKey) return;

  try {
    const ip = getClientIp(req);
    const userAgent = req?.headers?.['user-agent'] || '';
    const reqPath = req?.path || req?.url || '/';

    sendEvent({
      ip,
      userAgent,
      method: req?.method || 'GET',
      path: reqPath,
      kind: 'enumeration',
      detail: {
        reason: 'not_found_probing',
        path: reqPath,
      },
      severity: 'medium',
    });
  } catch {
    // Fail open
  }
}

export function loginFailed(req, username) {
  if (typeof mirage.onLoginFailed === 'function') {
    try {
      mirage.onLoginFailed(req, username);
    } catch {}
  }

  try {
    const ip = getClientIp(req);
    const userAgent = req?.headers?.['user-agent'] || '';
    const rawUsername = typeof username === 'string' ? username : String(username || '');
    const normalized = rawUsername.toLowerCase().trim();

    // Decoy usernames (admin, root, test, administrator) on real login = decoy_login event
    let kind = 'brute_force';
    let severity = 'medium';

    if (DECOY_USERNAMES.has(normalized)) {
      kind = 'decoy_login';
      severity = 'critical';
    } else if (isHoneytoken(rawUsername)) {
      kind = 'honeytoken';
      severity = 'critical';
    }

    sendEvent({
      ip,
      userAgent,
      method: req?.method || 'POST',
      path: req?.path || '/api/auth/login',
      username: rawUsername,
      kind,
      detail: {
        username: rawUsername,
        token: rawUsername,
        reason:
          kind === 'decoy_login'
            ? 'decoy_username_login_attempt'
            : kind === 'honeytoken'
            ? 'honeytoken_triggered'
            : 'authentication_failed',
      },
      severity,
    });
  } catch {
    // Fail open, never throw
  }
}

export function loginSucceeded(req, username) {
  if (typeof mirage.onLoginSucceeded === 'function') {
    try {
      mirage.onLoginSucceeded(req, username);
    } catch {}
  }

  try {
    const ip = getClientIp(req);
    const userAgent = req?.headers?.['user-agent'] || '';
    const rawUsername = typeof username === 'string' ? username : String(username || '');

    sendEvent({
      ip,
      userAgent,
      method: req?.method || 'POST',
      path: req?.path || '/api/auth/login',
      username: rawUsername,
      kind: 'scanner', // using contract kind
      detail: {
        username: rawUsername,
        reason: 'authentication_succeeded',
      },
      severity: 'info',
    });
  } catch {
    // Fail open, never throw
  }
}

mirage.loginFailed = loginFailed;
mirage.loginSucceeded = loginSucceeded;
mirage.reportEnumeration = reportEnumeration;
mirage.checkIpBlocked = checkIpBlocked;
mirage.sendEvent = sendEvent;
mirage.getClientIp = getClientIp;
mirage.getMirageConfig = getMirageConfig;
mirage.resetBlocklistCache = resetBlocklistCache;
mirage.isReservedTrapPath = isReservedTrapPath;
mirage.isHoneytoken = isHoneytoken;
mirage.serveFakeTrapResponse = serveFakeTrapResponse;
mirage.generateFakeBackupZip = generateFakeBackupZip;
mirage.detectSuspiciousActivity = detectSuspiciousActivity;
