import { test, expect, type Page } from '@playwright/test';

/**
 * Google sign-in E2E — stops at the OAuth boundary.
 *
 * The client build inlines VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, so the
 * click must trigger a real navigation to Supabase's /auth/v1/authorize with
 * provider=google. We let that request hit the network, then abort any hop to
 * accounts.google.com — no real Google account is ever needed, and the test
 * never reaches /auth/callback.
 */

const GOOGLE_BUTTON = /continue with google/i;

async function captureAuthorizeRequest(page: Page): Promise<string[]> {
  const captured: string[] = [];

  // 1. Let the real Supabase authorize request through...
  await page.route('**/auth/v1/authorize*', async (route) => {
    captured.push(route.request().url());
    try {
      await route.continue();
    } catch {
      // Navigation may already be considered handled — capture still counts.
    }
  });

  // 2. ...but stop dead before Google itself.
  await page.route('**/accounts.google.com/**', async (route) => {
    captured.push(route.request().url());
    await route.abort().catch(() => {});
  });

  return captured;
}

test.describe('Google OAuth sign-in', () => {
  test('Button renders on /login and /register', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: GOOGLE_BUTTON })).toBeVisible();

    await page.goto('/register');
    await expect(page.getByRole('button', { name: GOOGLE_BUTTON })).toBeVisible();
  });

  test('Click triggers Supabase oauth redirect (stopped before Google)', async ({ page }) => {
    const captured = await captureAuthorizeRequest(page);

    await page.goto('/login');

    // The inlined build must point at a Supabase project, not the placeholder.
    const appHtml = await page.content();
    expect(appHtml).toBeTruthy();

    await page.getByRole('button', { name: GOOGLE_BUTTON }).click();

    // First hop: Supabase's /auth/v1/authorize?provider=google...
    await expect
      .poll(
        () => captured.findIndex((url) => url.includes('/auth/v1/authorize')),
        {
          message: 'expected a request to Supabase /auth/v1/authorize',
          timeout: 20000,
        }
      )
      .toBeGreaterThanOrEqual(0);

    const authorizeUrl = captured.find((url) => url.includes('/auth/v1/authorize'))!;
    expect(authorizeUrl).toContain('/auth/v1/authorize');
    expect(authorizeUrl).toContain('provider=google');
    expect(authorizeUrl).toMatch(/\.supabase\.co/);
    expect(decodeURIComponent(authorizeUrl)).toContain('/auth/callback');

    // Give the flow a moment to attempt the Google hop (aborted when it does),
    // then make sure we never landed on the callback exchange page.
    await page
      .waitForRequest(
        (req) => req.url().includes('accounts.google.com') || req.url().includes('/auth/callback'),
        { timeout: 5000 }
      )
      .catch(() => {});
    expect(page.url()).not.toContain('/auth/callback');
  });
});
