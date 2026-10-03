import http from 'node:http';

// Paths to verify
const trapPaths = [
  '/admin-old',
  '/.env',
  '/backup.zip',
  '/wp-login.php',
  '/phpmyadmin',
  '/api/v1/internal/keys',
  '/admin-old/',
  '/ADMIN-OLD'
];

async function checkPath(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({
      hostname: '127.0.0.1',
      port: port,
      path: path,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,text/plain,*/*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const firstLine = data.split('\n')[0].trim();
        resolve({
          path,
          status: res.statusCode,
          contentType: res.headers['content-type'] || '',
          firstLine
        });
      });
    });
    req.on('error', reject);
  });
}

async function run() {
  process.env.PORT = '5055';
  process.env.NODE_ENV = 'production';
  process.env.SESSION_SECRET = 'verify-secret-token-32chars-asclepius';
  
  // Start server
  await import('../server/dist/index.js');
  
  // Wait a moment for server to listen
  await new Promise(r => setTimeout(r, 1200));

  console.log('--- PRODUCTION TRAP PATHS VERIFICATION ---');
  let allPassed = true;
  for (const p of trapPaths) {
    const result = await checkPath(5055, p);
    console.log(`Path: ${result.path.padEnd(25)} => Status: ${result.status} | Content-Type: ${result.contentType} | Body: "${result.firstLine}"`);
    if (result.status !== 404 || result.firstLine !== 'Not found') {
      allPassed = false;
    }
  }

  // Also verify a valid SPA path to prove index.html is served for valid routes
  const spaResult = await checkPath(5055, '/shop');
  console.log(`\nControl (Valid SPA Route):`);
  console.log(`Path: ${spaResult.path.padEnd(25)} => Status: ${spaResult.status} | Content-Type: ${spaResult.contentType} | Body: "${spaResult.firstLine.substring(0, 50)}..."`);

  if (!allPassed) {
    console.error('\nFAIL: Not all trap paths returned 404 Not found');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All 8 trap paths strictly returned 404 "Not found" (plain text).');
    process.exit(0);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
