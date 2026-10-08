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
      // Fall through so Express routing handles 404
      return next();
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
      kind: honeytokenHit ? 'honeytoken_triggered' : 'login_failed',
      detail: {
        username: typeof username === 'string' ? username : String(username),
        reason: honeytokenHit ? 'honeytoken_triggered' : 'authentication_failed',
      },
      severity: honeytokenHit ? 'critical' : 'low',
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
