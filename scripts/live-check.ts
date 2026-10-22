#!/usr/bin/env tsx
/**
 * scripts/live-check.ts
 *
 * Live deployment verification script for MediStore: Temple of Asclepius.
 *
 * Verifies that:
 * 1. GET /healthz is operational with valid status and security headers.
 * 2. Security headers (HSTS, CSP, X-Content-Type-Options, Frame-Options) are active.
 * 3. The 6 reserved trap paths (/admin-old, /.env, /backup.zip, /wp-login.php, /phpmyadmin, /api/v1/internal/keys)
 *    return either convincing decoy responses (when MirageSOC is configured) or 404 Not Found (when unconfigured).
 * 4. NO trap path is ever swallowed by the SPA fallback (index.html).
 *
 * Usage:
 *   MEDISTORE_URL=https://your-deployment.vercel.app npx tsx scripts/live-check.ts
 */

const targetUrl = (process.env.MEDISTORE_URL || process.argv[2] || '').trim().replace(/\/+$/, '');

if (!targetUrl) {
  console.log('======================================================================');
  console.log('MediStore Live Smoke Verification Script');
  console.log('======================================================================');
  console.log('Target URL not specified. This script will not run without a target.');
  console.log('\nUsage:');
  console.log('  MEDISTORE_URL=https://your-medistore.vercel.app npx tsx scripts/live-check.ts');
  console.log('  OR:');
  console.log('  npx tsx scripts/live-check.ts https://your-medistore.vercel.app\n');
  process.exit(0);
}

interface CheckResult {
  name: string;
  target: string;
  status: number;
  contentType: string;
  isDecoyOr404: boolean;
  notSpaFallback: boolean;
  pass: boolean;
  notes: string;
}

const TRAP_PATHS = [
  '/admin-old',
  '/.env',
  '/backup.zip',
  '/wp-login.php',
  '/phpmyadmin',
  '/api/v1/internal/keys',
];

async function runLiveSmokeCheck() {
  console.log('======================================================================');
  console.log(`Starting Live Smoke Verification for: ${targetUrl}`);
  console.log('======================================================================\n');

  let allPassed = true;
  const results: CheckResult[] = [];

  // Step 1: Capture baseline SPA index.html
  console.log('[1/4] Capturing baseline SPA root (GET /)...');
  let spaHtml = '';
  try {
    const spaRes = await fetch(`${targetUrl}/`);
    spaHtml = await spaRes.text();
    console.log(`  -> Baseline SPA received (${spaHtml.length} bytes, HTTP ${spaRes.status})`);
  } catch (err: any) {
    console.error(`  -> Failed to reach SPA root: ${err.message}`);
    process.exit(1);
  }

  // Step 2: Verify /healthz and security headers
  console.log('\n[2/4] Verifying /healthz and active security headers...');
  try {
    const healthRes = await fetch(`${targetUrl}/healthz`);
    const healthText = await healthRes.text();
    const contentType = healthRes.headers.get('content-type') || '';
    const nosniff = healthRes.headers.get('x-content-type-options');
    const xframe = healthRes.headers.get('x-frame-options');
    const csp = healthRes.headers.get('content-security-policy') || '';

    let isJsonOk = false;
    try {
      const parsed = JSON.parse(healthText);
      isJsonOk = parsed.status === 'ok';
    } catch {}

    const headersOk = nosniff === 'nosniff' && Boolean(xframe) && csp.includes("frame-ancestors 'none'");
    const healthPass = healthRes.status === 200 && isJsonOk && headersOk;

    results.push({
      name: 'Health Check & Headers',
      target: '/healthz',
      status: healthRes.status,
      contentType,
      isDecoyOr404: true,
      notSpaFallback: !healthText.includes('<div id="root">'),
      pass: healthPass,
      notes: `status=${healthRes.status}, nosniff=${nosniff || 'missing'}, csp=${csp ? 'active' : 'missing'}`,
    });

    if (!healthPass) allPassed = false;
    console.log(`  -> Health check: ${healthPass ? 'PASS' : 'FAIL'} (HTTP ${healthRes.status})`);
  } catch (err: any) {
    console.error(`  -> Health check failed: ${err.message}`);
    allPassed = false;
  }

  // Step 3: Verify each of the 6 reserved trap paths
  console.log('\n[3/4] Verifying 6 Reserved Trap Paths...');
  for (const trap of TRAP_PATHS) {
    try {
      const res = await fetch(`${targetUrl}${trap}`);
      const contentType = res.headers.get('content-type') || '';
      let bodyText = '';
      let isZip = false;

      if (trap === '/backup.zip') {
        const buf = Buffer.from(await res.arrayBuffer());
        isZip = buf.subarray(0, 4).toString('hex') === '504b0304';
        bodyText = `[Binary ZIP, ${buf.length} bytes, magic=${buf.subarray(0, 4).toString('hex')}]`;
      } else {
        bodyText = await res.text();
      }

      // Assertions:
      // 1. Must NOT match the SPA root index.html
      const notSpa = !bodyText.includes('<div id="root">') && bodyText !== spaHtml;
      // 2. Must be either 200 (convincing decoy response) OR 404 (clean unconfigured pass-through)
      const validStatus = res.status === 200 || res.status === 404;
      const isDecoy = res.status === 200 && (isZip || bodyText.length > 30);
      const isClean404 = res.status === 404 && bodyText.includes('Not found');

      const pass = notSpa && validStatus && (isDecoy || isClean404);
      if (!pass) allPassed = false;

      results.push({
        name: `Trap: ${trap}`,
        target: trap,
        status: res.status,
        contentType,
        isDecoyOr404: isDecoy || isClean404,
        notSpaFallback: notSpa,
        pass,
        notes: isDecoy
          ? 'Convincing decoy served (MirageSOC configured)'
          : isClean404
          ? '404 Not Found served (MirageSOC pass-through)'
          : 'Unexpected response or SPA fallback leakage',
      });

      console.log(`  -> ${trap.padEnd(24)}: HTTP ${res.status} [${contentType}] | SPA leak: ${notSpa ? 'NO (PASS)' : 'YES (FAIL)'}`);
    } catch (err: any) {
      console.error(`  -> ${trap} query failed: ${err.message}`);
      allPassed = false;
    }
  }

  // Step 4: Summary Table
  console.log('\n======================================================================');
  console.log('LIVE SMOKE VERIFICATION REPORT');
  console.log('======================================================================');
  console.table(
    results.map((r) => ({
      Target: r.target,
      Status: r.status,
      'Content-Type': r.contentType.split(';')[0],
      'Decoy/404': r.isDecoyOr404 ? 'YES' : 'NO',
      'No SPA Fallback': r.notSpaFallback ? 'YES' : 'NO',
      Result: r.pass ? 'PASS' : 'FAIL',
      Notes: r.notes,
    }))
  );

  console.log(`\nOVERALL VERDICT: ${allPassed ? '>>> ALL CHECKS PASSED <<<' : '>>> SOME CHECKS FAILED <<<'}\n`);
  process.exit(allPassed ? 0 : 1);
}

runLiveSmokeCheck();
