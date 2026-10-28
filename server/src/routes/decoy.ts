import { Router, Request, Response } from 'express';
// @ts-ignore - mirage.js is a plain JS module
import mirage from '../../mirage.js';

export const decoyRouter = Router();

// Body capped at 2KB
decoyRouter.use((req: Request, res: Response, next) => {
  const cl = Number(req.headers['content-length']) || 0;
  if (cl > 2048) {
    return res.status(413).type('text/plain').send('Payload Too Large: Body capped at 2KB');
  }
  next();
});

export const DECOY_FORM_PATHS = [
  '/admin-old/auth',
  '/wp-login.php',
  '/phpmyadmin/index.php',
];

const HONEYTOKEN_CANARY_VALUES = [
  'AKIA_CANARY_TRAP_TOKEN_89231',
  'ora_sec_live_99f82d1ab673024c0847937402a',
  'key_live_oracle_priest_9021',
  'key_canary_vault_token_8819',
  'AsclepiusGoldPass2026!',
];

function inspectCredentialsAndEmit(
  req: Request,
  reqPath: string,
  rawUsername: string,
  rawPassword: string
) {
  const ip = typeof mirage.getClientIp === 'function' ? mirage.getClientIp(req) : (req.ip || '');
  const userAgent = req.headers['user-agent'] || '';

  const usernameCanary = HONEYTOKEN_CANARY_VALUES.find((c) => rawUsername.includes(c));
  const passwordCanary = rawPassword
    ? HONEYTOKEN_CANARY_VALUES.find((c) => rawPassword.includes(c))
    : null;
  const canaryMatched = Boolean(usernameCanary || passwordCanary);

  const kind = canaryMatched ? 'honeytoken' : 'decoy_login';
  const severity = 'critical';

  if (typeof mirage.sendEvent === 'function') {
    mirage.sendEvent({
      ip,
      userAgent,
      method: 'POST',
      path: reqPath,
      username: rawUsername,
      kind,
      detail: {
        path: reqPath,
        username: rawUsername,
        canaryMatched,
        passwordLength: rawPassword.length,
        reason: canaryMatched ? 'honeytoken_triggered' : 'decoy_form_submitted',
      },
      severity,
    });
  }
}

// 1. POST /admin-old/auth
decoyRouter.post('/admin-old/auth', (req: Request, res: Response) => {
  const user = String(req.body?.user || req.body?.admin_user || req.body?.username || '');
  const key = String(req.body?.key || req.body?.admin_key || req.body?.password || '');

  inspectCredentialsAndEmit(req, '/admin-old/auth', user, key);

  return res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Temple of Asclepius - Authentication Failed</title>
  <style>
    body { background-color: #0d1117; color: #c9d1d9; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #161b22; border: 1px solid #f85149; border-radius: 6px; width: 420px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
    h2 { color: #f85149; margin-top: 0; font-size: 18px; border-bottom: 1px solid #30363d; padding-bottom: 12px; }
    .error { background: rgba(248,81,73,0.15); border: 1px solid #f85149; color: #ff7b72; padding: 12px; border-radius: 4px; font-size: 13px; margin-bottom: 16px; line-height: 1.4; }
    a { color: #58a6ff; text-decoration: none; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Sanctuary Verification Refused</h2>
    <div class="error">Security Exception: Master Devotional Key rejected by Epidaurus Node Epidaurus-Prod-01. Access key unauthorized for operator "${user || 'anonymous'}".</div>
    <p><a href="/admin-old">&larr; Return to Sanctuary Operator Console</a></p>
  </div>
</body>
</html>`);
});

// 2. POST /wp-login.php
decoyRouter.post('/wp-login.php', (req: Request, res: Response) => {
  const log = String(req.body?.log || req.body?.user_login || req.body?.username || '');
  const pwd = String(req.body?.pwd || req.body?.user_pass || req.body?.password || '');

  inspectCredentialsAndEmit(req, '/wp-login.php', log, pwd);

  return res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8" />
  <title>Log In ‹ MediStore Ancient Dispensary — WordPress</title>
  <style>
    body { background: #f0f0f1; color: #3c434a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .login-box { background: #fff; border: 1px solid #c3c4c7; padding: 26px 24px; width: 320px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .login-box h1 { text-align: center; font-size: 20px; margin-top: 0; color: #1d2327; }
    .notice { border-left: 4px solid #d63638; background: #fff; padding: 12px; margin-bottom: 20px; box-shadow: 0 1px 1px rgba(0,0,0,0.04); font-size: 13px; }
    .login-box label { font-size: 14px; line-height: 1.5; color: #2c3338; display: block; margin-bottom: 3px; }
    .login-box input[type="text"], .login-box input[type="password"] { font-size: 16px; width: 100%; box-sizing: border-box; padding: 6px 10px; border: 1px solid #8c8f94; border-radius: 4px; margin-bottom: 16px; }
    .login-box input[type="submit"] { background: #2271b1; border: 1px solid #2271b1; color: #fff; font-size: 14px; font-weight: 600; padding: 6px 12px; border-radius: 4px; cursor: pointer; float: right; }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>MediStore Dispensary</h1>
    <div class="notice"><strong>Error:</strong> The username or password you entered is incorrect. <a href="/wp-login.php">Lost your password?</a></div>
    <form name="loginform" id="loginform" action="/wp-login.php" method="post">
      <p>
        <label for="user_login">Username or Email Address</label>
        <input type="text" name="log" id="user_login" class="input" value="${log ? log.replace(/"/g, '&quot;') : ''}" size="20" autocomplete="username" />
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
});

// 3. POST /phpmyadmin/index.php
decoyRouter.post(['/phpmyadmin/index.php', '/phpmyadmin'], (req: Request, res: Response) => {
  const pmaUsername = String(req.body?.pma_username || req.body?.username || '');
  const pmaPassword = String(req.body?.pma_password || req.body?.password || '');

  inspectCredentialsAndEmit(req, '/phpmyadmin/index.php', pmaUsername, pmaPassword);

  return res.status(200).type('text/html').send(`<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <title>phpMyAdmin 5.2.1 - Access Denied</title>
  <style>
    body { font-family: sans-serif; background: #f3f3f3; color: #222; margin: 0; padding: 40px; display: flex; justify-content: center; }
    .pma-panel { background: #fff; border: 1px solid #aaa; border-radius: 5px; width: 500px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .pma-header { border-bottom: 2px solid #e3a824; padding-bottom: 10px; margin-bottom: 20px; }
    .error-box { background: #fbe3e4; border: 1px solid #fbc2c4; color: #d12f19; padding: 14px; border-radius: 4px; font-size: 13px; margin-bottom: 15px; line-height: 1.5; }
    a { color: #235a81; }
  </style>
</head>
<body>
  <div class="pma-panel">
    <div class="pma-header"><h2>phpMyAdmin 5.2.1 - Access Denied</h2></div>
    <div class="error-box">
      <strong>#1045 - Access denied for user '${pmaUsername || 'root'}'@'localhost' (using password: YES)</strong><br><br>
      phpMyAdmin tried to connect to the MySQL / MariaDB server, and the server rejected the connection. You should check the host, username and password in your configuration and make sure that they correspond to the information provided by the administrator of the database server.
    </div>
    <p><a href="/phpmyadmin">&larr; Return to login options</a></p>
  </div>
</body>
</html>`);
});
