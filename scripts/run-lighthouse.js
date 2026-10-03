import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const reportsDir = path.resolve(process.cwd(), 'docs/lighthouse');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
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
  console.log('[Lighthouse Runner] Server ready. Commencing Lighthouse audits...');

  const pages = [
    { name: 'home', url: 'http://127.0.0.1:5000/' },
    { name: 'shop', url: 'http://127.0.0.1:5000/shop' },
    { name: 'product', url: 'http://127.0.0.1:5000/shop/med-01' },
  ];

  const scores = {};

  for (const page of pages) {
    console.log(`\n--- Auditing ${page.name} (${page.url}) ---`);
    const jsonPath = path.join(reportsDir, `${page.name}.report.json`);
    const htmlPath = path.join(reportsDir, `${page.name}.report.html`);

    try {
      execSync(
        `npx lighthouse "${page.url}" --output=json,html --output-path="${path.join(
          reportsDir,
          page.name
        )}" --chrome-flags="--headless=new --no-sandbox" --form-factor=mobile --screenEmulation.mobile=true --quiet`,
        { stdio: 'inherit' }
      );

      // Lighthouse outputs <name>.report.json and <name>.report.html
      let reportData;
      if (fs.existsSync(jsonPath)) {
        reportData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } else {
        const altJson = path.join(reportsDir, `${page.name}.report.json`);
        reportData = JSON.parse(fs.readFileSync(altJson, 'utf8'));
      }

      const perf = Math.round((reportData.categories.performance?.score || 0) * 100);
      const a11y = Math.round((reportData.categories.accessibility?.score || 0) * 100);
      const bp = Math.round((reportData.categories['best-practices']?.score || 0) * 100);
      const seo = Math.round((reportData.categories.seo?.score || 0) * 100);

      scores[page.name] = { Performance: perf, Accessibility: a11y, 'Best Practices': bp, SEO: seo };
      console.log(`Scores for ${page.name}:`, scores[page.name]);
    } catch (err) {
      console.error(`Audit failed for ${page.name}:`, err.message);
    }
  }

  console.log('\n========================================');
  console.log('LIGHTHOUSE MOBILE AUDIT RESULTS SUMMARY');
  console.log('========================================');
  console.table(scores);

  serverProc.kill();
  process.exit(0);
}

runAudit().catch((err) => {
  console.error(err);
  serverProc.kill();
  process.exit(1);
});
