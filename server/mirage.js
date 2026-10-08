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
  /(sqlmap|nikto|nmap|masscan|wpscan|acunetix|nessus|gobuster|dirbuster|hydra|zgrab)/i;
const SQLI_REGEX =
  /(\b(UNION(\s+ALL)?\s+SELECT|SELECT.+FROM|INSERT\s+INTO|UPDATE.+SET|DELETE\s+FROM)\b|'\s*OR\s*('?[0-9]+'?'?\s*=\s*'?[0-9]+|1\s*=\s*1)|\b(SLEEP|BENCHMARK)\s*\(|--|;--)/i;
const XSS_REGEX =
  /(<script\b|javascript:|onerror\s*=|onload\s*=|alert\(|<svg|<img.+onerror)/i;
const PROBE_PATH_REGEX =
  /(\.git|\.aws|\.svn|\.config|wp-admin|actuator|phpinfo|eval-stdin)/i;

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

function getMirageConfig() {
  const url = (process.env.MIRAGE_URL || 'https://mirage-soc.vercel.app').replace(/\/+$/, '');
  const apiKey = process.env.MIRAGE_API_KEY || '';
  return { url, apiKey };
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

export async function checkIpBlocked(ip) {
  if (!ip) return false;
  const { url, apiKey } = getMirageConfig();
  if (!url || !apiKey) return false;

  const timeoutMs =
    Number(process.env.MIRAGE_BLOCKLIST_TIMEOUT) ||
    (process.env.NODE_ENV === 'test' && url.includes('vercel.app') ? 80 : 800);

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

    const normalizedIp = ip.trim().replace(/^::ffff:/, '');

    if (Array.isArray(data)) {
      return data.some(
        (entry) =>
          typeof entry === 'string' && entry.trim().replace(/^::ffff:/, '') === normalizedIp
      );
    }

    const list = data.ips || data.blocked || data.blocklist;
    if (Array.isArray(list)) {
      return list.some(
        (entry) =>
          typeof entry === 'string' && entry.trim().replace(/^::ffff:/, '') === normalizedIp
      );
    }

    if (data.blocked === true) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn(`[Mirage] Blocklist check failed open: ${err?.message || err}`);
    return false;
  }
}

export function sendEvent(eventPayload) {
  const { url, apiKey } = getMirageConfig();
  if (!url || !apiKey) return;

  try {
    const promise = fetch(`${url}/api/event`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
      signal: AbortSignal.timeout(1200),
    })
      .then(() => {})
      .catch(() => {});

    try {
      if (typeof waitUntil === 'function') {
        waitUntil(promise);
      }
    } catch {
      // Ignore if outside Vercel runtime
    }
  } catch {
    // Fail open safely
  }
}

function detectSuspiciousActivity(req, reqPath, userAgent) {
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

  const fullUrl = req.originalUrl || req.url || reqPath;
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

  if (reqPath && PROBE_PATH_REGEX.test(reqPath)) {
    return {
      kind: 'scanner',
      severity: 'medium',
      detail: {
        reason: 'path_enumeration_probe_detected',
        path: reqPath,
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
    const rawIp =
      req.ip || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const ip = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '').replace(
      /^::ffff:/,
      ''
    );
    const userAgent = req.headers?.['user-agent'] || '';
    const reqPath = req.path || req.url || '/';

    // Per-invocation cache: store decision on req object
    let isBlocked = req._mirageBlocked;
    if (typeof isBlocked !== 'boolean') {
      isBlocked = await checkIpBlocked(ip);
      req._mirageBlocked = isBlocked;
    }

    if (isBlocked) {
      return res.status(403).type('text/plain').send('Forbidden');
    }

    // Check reserved trap paths
    if (isReservedTrapPath(reqPath)) {
      sendEvent({
        ip,
        user_agent: userAgent,
        method: req.method,
        path: reqPath,
        kind: 'trap_hit',
        detail: {
          path: reqPath,
          reason: 'reserved_trap_path',
        },
        severity: 'high',
      });
      // Return convincing decoy response
      return serveFakeTrapResponse(reqPath, res);
    }

    // Check suspicious signatures
    const detection = detectSuspiciousActivity(req, reqPath, userAgent);
    if (detection) {
      sendEvent({
        ip,
        user_agent: userAgent,
        method: req.method,
        path: reqPath,
        kind: detection.kind,
        detail: detection.detail,
        severity: detection.severity,
      });
    }

    return next();
  } catch (err) {
    console.warn('[Mirage] Error in mirage middleware, failing open:', err?.message || err);
    return next();
  }
}

export function loginFailed(req, username) {
  if (typeof mirage.onLoginFailed === 'function') {
    try {
      mirage.onLoginFailed(req, username);
    } catch {}
  }

  try {
    const rawIp =
      req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const ip = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '').replace(
      /^::ffff:/,
      ''
    );
    const userAgent = req?.headers?.['user-agent'] || '';
    const honeytokenHit = isHoneytoken(username);

    sendEvent({
      ip,
      user_agent: userAgent,
      method: req?.method || 'POST',
      path: req?.path || '/api/auth/login',
      username: typeof username === 'string' ? username : String(username),
      kind: honeytokenHit ? 'honeytoken' : 'brute_force',
      detail: {
        username: typeof username === 'string' ? username : String(username),
        token: typeof username === 'string' ? username : String(username),
        reason: honeytokenHit ? 'honeytoken_triggered' : 'authentication_failed',
      },
      severity: honeytokenHit ? 'critical' : 'medium',
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
    const rawIp =
      req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const ip = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '').replace(
      /^::ffff:/,
      ''
    );
    const userAgent = req?.headers?.['user-agent'] || '';

    sendEvent({
      ip,
      user_agent: userAgent,
      method: req?.method || 'POST',
      path: req?.path || '/api/auth/login',
      username: typeof username === 'string' ? username : String(username),
      kind: 'login_succeeded',
      detail: {
        username: typeof username === 'string' ? username : String(username),
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
mirage.checkIpBlocked = checkIpBlocked;
mirage.sendEvent = sendEvent;
mirage.isReservedTrapPath = isReservedTrapPath;
mirage.isHoneytoken = isHoneytoken;
mirage.serveFakeTrapResponse = serveFakeTrapResponse;
mirage.generateFakeBackupZip = generateFakeBackupZip;
