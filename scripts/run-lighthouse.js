import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const THEMES = ['light', 'dark', 'aesthetic'];

const baseReportsDir = path.resolve(process.cwd(), 'docs/lighthouse');
for (const th of THEMES) {
  const dir = path.join(baseReportsDir, th);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. Start production server
console.log('[Lighthouse Runner] Launching production server on port 5000...');
const serverProc = spawn('node', ['server/dist/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: '5000', NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProc.stdout.on('data', (d) => process.stdout.write(`[Server] ${d}`));
serverProc.stderr.on('data', (d) => process.stderr.write(`[Server Err] ${d}`));

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:5000/healthz');
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server timed out starting on port 5000');
}

async function runAudit() {
  await waitForServer();
  console.log('[Lighthouse Runner] Server ready. Commencing Lighthouse mobile audits across 3 themes...');

  const pages = [
    { name: 'home', path: '/' },
    { name: 'shop', path: '/shop' },
    { name: 'product', path: '/shop/med-01' },
  ];

  const allScores = {};

  for (const theme of THEMES) {
    const themeReportsDir = path.join(baseReportsDir, theme);
    console.log(`\n======================================================`);
    console.log(`  AUDITING THEME: ${theme.toUpperCase()} (docs/lighthouse/${theme}/)`);
    console.log(`======================================================`);

    for (const page of pages) {
      const targetUrl = `http://127.0.0.1:5000${page.path}?theme=${theme}`;
      console.log(`\n--- Auditing ${page.name} (${targetUrl}) ---`);
      const outputBase = path.join(themeReportsDir, page.name);
      const jsonPath = `${outputBase}.report.json`;

      try {
        execSync(
          `npx lighthouse "${targetUrl}" --output=json,html --output-path="${outputBase}" --chrome-flags="--headless=new --no-sandbox" --form-factor=mobile --screenEmulation.mobile=true --quiet`,
          { stdio: 'inherit' }
        );

        let reportData;
        if (fs.existsSync(jsonPath)) {
          reportData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } else if (fs.existsSync(`${outputBase}.json`)) {
          reportData = JSON.parse(fs.readFileSync(`${outputBase}.json`, 'utf8'));
        }

        if (reportData) {
          const perf = Math.round((reportData.categories.performance?.score || 0) * 100);
          const a11y = Math.round((reportData.categories.accessibility?.score || 0) * 100);
          const bp = Math.round((reportData.categories['best-practices']?.score || 0) * 100);
          const seo = Math.round((reportData.categories.seo?.score || 0) * 100);

          const lcp = reportData.audits?.['largest-contentful-paint']?.displayValue || '-';
          const tbt = reportData.audits?.['total-blocking-time']?.displayValue || '-';
          const cls = reportData.audits?.['cumulative-layout-shift']?.displayValue || '-';
          const fcp = reportData.audits?.['first-contentful-paint']?.displayValue || '-';

          const key = `${theme}-${page.name}`;
          allScores[key] = {
            Theme: theme,
            Page: page.name,
            Performance: perf,
            Accessibility: a11y,
            'Best Practices': bp,
            SEO: seo,
            FCP: fcp,
            LCP: lcp,
            TBT: tbt,
            CLS: cls,
          };
          console.log(`Scores for ${key}:`, allScores[key]);
        }
      } catch (err) {
        console.error(`Audit failed for ${page.name} (${theme}):`, err.message);
      }
    }
  }

  console.log('\n================================================================');
  console.log('   LIGHTHOUSE MOBILE TRI-THEME AUDIT RESULTS SUMMARY');
  console.log('================================================================');
  console.table(allScores);

  serverProc.kill();
  process.exit(0);
}

runAudit().catch((err) => {
  console.error(err);
  serverProc.kill();
  process.exit(1);
});
