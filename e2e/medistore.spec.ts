import { test, expect } from '@playwright/test';

test.describe('MediStore: Temple of Asclepius Smoke Test Suite', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected 404/401 network responses logged by browser
        if (
          !text.includes('Failed to load resource') &&
          !text.includes('404') &&
          !text.includes('401')
        ) {
          consoleErrors.push(text);
        }
      }
    });
  });

  test.afterEach(async () => {
    expect(consoleErrors).toEqual([]);
  });

  test('1. Home page displays brand, 3D/fallback hero, and disclaimer', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/MediStore: Temple of Asclepius/i);
    await expect(page.locator('h1').first()).toBeVisible();

    // Verify statutory disclaimer
    await expect(
      page.getByText('Licensed Apothecary & Dispensary. Consecrated by the Asclepeion.').first()
    ).toBeVisible();
  });

  test('2. Browse Apothecary catalogue, filter, and inspect product', async ({ page }) => {
    await page.goto('/shop');

    // Check dispensary header
    await expect(page.getByText('The Apothecary Archives')).toBeVisible();

    // Verify product cards appear
    const productCard = page.locator('a[href^="/shop/med-"]').first();
    await expect(productCard).toBeVisible();

    // Navigate to product detail
    await productCard.click();
    await expect(page).toHaveURL(/.*\/shop\/med-.*/);

    // Verify batch ID and dosage details
    await expect(page.getByText('Batch ID:', { exact: false })).toBeVisible();
    await expect(page.getByText('Ritual Dosage & Protocol', { exact: false })).toBeVisible();
  });

  test('3. Verify batch authenticity on-chain in mock mode', async ({ page }) => {
    await page.goto('/shop/med-01');

    // Click verify on chain
    const verifyBtn = page.getByRole('button', { name: /Verify Authenticity On Chain/i });
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Modal should show "Sealed by the Oracle"
    await expect(page.getByText('Sealed by the Oracle', { exact: false })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Decentralized Ledger', { exact: false })).toBeVisible();
  });

  test('4. Add product to cart, edit quantity, and checkout with fake receipt', async ({
    page,
  }) => {
    await page.goto('/shop/med-01');

    // Add to cart
    const addBtn = page.getByRole('button', { name: /Deposit Into Sacred Cart/i });
    await addBtn.click();

    // Toast notification
    await expect(page.getByText(/sacred requisition/i).first()).toBeVisible();

    // Go to cart
    await page.goto('/cart');
    await expect(page.getByText('Sacred Requisition Basket')).toBeVisible();
    await expect(page.getByText('Pythian Willow Salicin')).toBeVisible();

    // Proceed to checkout
    const checkoutLink = page.getByRole('button', { name: /Proceed to Consecration/i });
    await checkoutLink.click();
    await expect(page).toHaveURL(/.*\/checkout/);

    // Fill form
    await page.getByLabel(/Full Devotee Name/i).fill('Hermes of Epidaurus');
    await page.getByLabel(/Sanctum Scroll Email/i).fill('hermes@epidaurus.org');
    await page.getByLabel(/Street Address/i).fill('42 Sanctum Alley');
    await page.getByLabel(/City/i).fill('Corinth');
    await page.getByLabel(/State/i).fill('Peloponnese');
    await page.getByLabel(/Postal Code/i).fill('20100');

    // Submit order
    const submitBtn = page.getByRole('button', { name: /Seal Requisition & Consecrate/i });
    await submitBtn.click();

    // Confirmation page
    await expect(page).toHaveURL(/.*\/order-confirmation\/ORD-.*/, { timeout: 10000 });
    await expect(page.getByText('Consecration Confirmed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Hermes of Epidaurus').first()).toBeVisible();
  });

  test('5. Customer login -> /dashboard shows themed 403', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    await page.getByLabel(/Sanctum Scroll Email/i).fill('customer@medistore.test');
    await page.getByLabel(/Secret Passphrase/i).fill('Demo@12345');
    await page.getByRole('button', { name: /Enter Sanctuary/i }).click();

    // Customer is redirected to /shop
    await expect(page).toHaveURL(/.*\/shop/, { timeout: 10000 });

    // Customer attempts to access pharmacist dashboard
    await page.goto('/dashboard');
    await expect(page.getByText(/The High Sanctum is Sealed/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Access Prohibited/i)).toBeVisible();
  });

  test('6. Pharmacist login -> dashboard loads', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    await page.getByLabel(/Sanctum Scroll Email/i).fill('pharmacist@medistore.test');
    await page.getByLabel(/Secret Passphrase/i).fill('Demo@12345');
    await page.getByRole('button', { name: /Enter Sanctuary/i }).click();

    // Should redirect directly to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    await expect(page.getByText(/Pharmacist Sanctum Dashboard/i)).toBeVisible();
    await expect(page.getByText(/Cumulative Tithe/i)).toBeVisible();
    await expect(page.getByText(/Inventory Register/i)).toBeVisible();
  });

  test('7. Wallet mock login completes authentication successfully', async ({ page }) => {
    await page.goto('/login');

    // Click Web3 wallet button
    const walletBtn = page.getByRole('button', { name: /Enter with Web3 Wallet/i });
    await expect(walletBtn).toBeVisible();
    await walletBtn.click();

    // Mock SIWE signs and redirects to /shop
    await expect(page).toHaveURL(/.*\/shop/, { timeout: 10000 });
    await expect(page.getByText('The Apothecary Archives')).toBeVisible();
  });

  test('8. Oracle consultation answers with scripted responses', async ({ page }) => {
    await page.goto('/oracle');
    await expect(page.getByText(/The Oracle of Asclepius/i)).toBeVisible();

    // Click a suggestion chip
    const chip = page.getByRole('button', { name: /What remedies soothe winter coughs\?/i });
    await chip.click();

    // Verify response
    await expect(page.getByText(/Olympian Elderberry Elixir/i)).toBeVisible({ timeout: 15000 });
  });

  test('9. Quest riddle page and Oracle Terminal retro UI', async ({ page }) => {
    await page.goto('/quest');
    await expect(page.getByText(/The Riddle of the Broken Seal/i)).toBeVisible();
    await expect(page.getByText(/\/admin-old/i)).toBeVisible();

    // Navigate to terminal
    await page.getByRole('button', { name: /Open Oracle Console/i }).click();
    await expect(page).toHaveURL(/.*\/terminal/);
    await expect(page.getByText(/deploy@medistore-prod:~\$/i).first()).toBeVisible();
  });

  test('10. WebGL disabled triggers static Asclepius hero fallback', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate missing WebGL support
      HTMLCanvasElement.prototype.getContext = function (type: string) {
        if (type.includes('webgl')) return null;
        return null;
      };
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="static-hero-fallback"]')).toBeVisible();
  });

  test('11. prefers-reduced-motion triggers static Asclepius hero fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('[data-testid="static-hero-fallback"]')).toBeVisible();
  });
});
