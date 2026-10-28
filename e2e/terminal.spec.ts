import { test, expect } from '@playwright/test';

test.describe('Terminal Page with MirageSOC Output Response Contract', () => {
  test('renders command output from MirageSOC {output} response payload', async ({ page }) => {
    // Mock the terminal backend endpoint to return MirageSOC's {output} format
    await page.route(/.*\/api\/terminal.*/, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          },
        });
      }

      const request = route.request();
      const postData = request.postDataJSON() || {};
      const cmd = postData.cmd || '';

      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json',
      };

      if (cmd === 'whoami') {
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            success: true,
            command: 'whoami',
            output: 'deploy-sanctum-operator',
            attackerId: 'mock-attacker-hash-12345',
          }),
        });
      }

      if (cmd === 'ls') {
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            success: true,
            command: 'ls',
            output: 'secrets.txt  provenance_ledger.sql  remedies.conf',
            attackerId: 'mock-attacker-hash-12345',
          }),
        });
      }

      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          success: true,
          command: cmd,
          output: `executed: ${cmd}`,
        }),
      });
    });

    await page.goto('/terminal');

    // Terminal page input selector
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();

    // Type command and press enter
    await input.fill('whoami');
    await input.press('Enter');

    // Verify output text renders on screen
    await expect(page.locator('.font-mono').first()).toContainText('deploy-sanctum-operator');

    // Type second command
    await input.fill('ls');
    await input.press('Enter');

    // Verify ls output renders on screen
    await expect(page.locator('.font-mono').first()).toContainText('provenance_ledger.sql');
  });

  test('maintains backward-compatibility with {reply} format', async ({ page }) => {
    await page.route(/.*\/api\/terminal.*/, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          },
        });
      }

      return route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reply: 'sanctuary-legacy-terminal-service',
        }),
      });
    });

    await page.goto('/terminal');
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();

    await input.fill('status');
    await input.press('Enter');

    // Built-in status prints local status, but let's test a non-builtin like uname
    await input.fill('uname -a');
    await input.press('Enter');

    await expect(page.locator('.font-mono').first()).toContainText('sanctuary-legacy-terminal-service');
  });
});
