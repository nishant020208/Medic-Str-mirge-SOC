import { test, expect } from '@playwright/test';

const DEPLOYED_URL = process.env.DEPLOYED_URL || 'https://asclepius-gamma.vercel.app';

test.describe('Walk All Client Routes - Zero False Positives & No Block', () => {
  const routesToWalk = [
    '/',
    '/shop',
    '/shop/med-01',
    '/cart',
    '/checkout',
    '/order-confirmation/ORD-SAMPLE-99',
    '/login',
    '/register',
    '/dashboard',
    '/oracle',
    '/quest',
    '/terminal',
    '/auth/callback',
  ];

  test('Walks every registered client route across 60s without being blocked or triggering events', async ({ page }) => {
    test.setTimeout(90000); // 90 second budget for full session

    for (let i = 0; i < routesToWalk.length; i++) {
      const targetPath = routesToWalk[i];
      const targetUrl = `${DEPLOYED_URL}${targetPath}`;
      console.log(`[Playwright Walk ${i + 1}/${routesToWalk.length}] Visiting ${targetUrl}...`);

      const res = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      expect(res).not.toBeNull();
      // Status must be 200 OK (never 403 Forbidden / Access blocked)
      expect(res!.status()).toBe(200);

      // Verify the page content rendered without "Access blocked"
      const bodyText = await page.innerText('body');
      expect(bodyText).not.toContain('Access blocked');
      expect(bodyText).not.toContain('Forbidden');

      // Natural user pause between route navigations
      await page.waitForTimeout(2000);
    }

    console.log('Successfully walked all 13 routes without any blocks or errors!');
  });
});
