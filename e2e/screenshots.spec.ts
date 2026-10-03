import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots');

test.describe('MediStore Visual Captures (Desktop & Mobile)', () => {
  test('Capture Desktop (1440x900) and Mobile (390x844) Screenshots', async ({ browser }) => {
    // 1. Desktop Context
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();

    // 1.1 Home Light
    await desktopPage.goto('/');
    await desktopPage.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('medistore_theme', 'light');
    });
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-light-desktop.png'),
      fullPage: false,
    });

    // 1.2 Home Dark
    await desktopPage.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('medistore_theme', 'dark');
    });
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-dark-desktop.png'),
      fullPage: false,
    });

    // 1.3 Shop
    await desktopPage.goto('/shop');
    await desktopPage.waitForSelector('h3');
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'shop-desktop.png'),
      fullPage: false,
    });

    // 1.4 Product with Verify Seal
    await desktopPage.goto('/shop/med-01');
    const verifyBtn = desktopPage.getByRole('button', { name: /Verify Authenticity On Chain/i });
    await verifyBtn.click();
    await desktopPage.waitForSelector('text=Sealed by the Oracle');
    await desktopPage.waitForTimeout(500);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'product-seal-desktop.png'),
      fullPage: false,
    });

    // 1.5 Cart
    await desktopPage.goto('/shop/med-01');
    const addBtn = desktopPage.getByRole('button', { name: /Deposit Into Sacred Cart/i });
    await addBtn.click();
    await desktopPage.waitForTimeout(300);
    await desktopPage.goto('/cart');
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cart-desktop.png'),
      fullPage: false,
    });

    // 1.6 Dashboard (Pharmacist)
    await desktopPage.goto('/login');
    await desktopPage.getByRole('button', { name: 'Pharmacist' }).click();
    await desktopPage.getByRole('button', { name: /Enter Sanctuary/i }).click();
    await desktopPage.waitForURL('**/dashboard');
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-desktop.png'),
      fullPage: false,
    });

    // 1.7 Oracle
    await desktopPage.goto('/oracle');
    const oracleChip = desktopPage.getByRole('button', { name: /What remedies soothe winter coughs\?/i });
    await oracleChip.click();
    await desktopPage.waitForSelector('text=Olympian Elderberry Elixir');
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oracle-desktop.png'),
      fullPage: false,
    });

    // 1.8 Quest
    await desktopPage.goto('/quest');
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'quest-desktop.png'),
      fullPage: false,
    });

    // 1.9 Terminal
    await desktopPage.goto('/terminal');
    await desktopPage.waitForTimeout(400);
    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'terminal-desktop.png'),
      fullPage: false,
    });

    await desktopContext.close();

    // 2. Mobile Context (390x844 iPhone 12/13/14 format)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    // 2.1 Home Light Mobile
    await mobilePage.goto('/');
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('medistore_theme', 'light');
    });
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-light-mobile.png'),
      fullPage: false,
    });

    // 2.2 Home Dark Mobile
    await mobilePage.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('medistore_theme', 'dark');
    });
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-dark-mobile.png'),
      fullPage: false,
    });

    // 2.3 Shop Mobile
    await mobilePage.goto('/shop');
    await mobilePage.waitForSelector('h3');
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'shop-mobile.png'),
      fullPage: false,
    });

    // 2.4 Product Seal Mobile
    await mobilePage.goto('/shop/med-01');
    const mobileVerifyBtn = mobilePage.getByRole('button', { name: /Verify Authenticity On Chain/i });
    await mobileVerifyBtn.click();
    await mobilePage.waitForSelector('text=Sealed by the Oracle');
    await mobilePage.waitForTimeout(500);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'product-seal-mobile.png'),
      fullPage: false,
    });

    // 2.5 Cart Mobile
    await mobilePage.goto('/shop/med-01');
    const mobileAddBtn = mobilePage.getByRole('button', { name: /Deposit Into Sacred Cart/i });
    await mobileAddBtn.click();
    await mobilePage.waitForTimeout(300);
    await mobilePage.goto('/cart');
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'cart-mobile.png'),
      fullPage: false,
    });

    // 2.6 Dashboard Mobile
    await mobilePage.goto('/login');
    await mobilePage.getByRole('button', { name: 'Pharmacist' }).click();
    await mobilePage.getByRole('button', { name: /Enter Sanctuary/i }).click();
    await mobilePage.waitForURL('**/dashboard');
    await mobilePage.waitForTimeout(600);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dashboard-mobile.png'),
      fullPage: false,
    });

    // 2.7 Oracle Mobile
    await mobilePage.goto('/oracle');
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'oracle-mobile.png'),
      fullPage: false,
    });

    // 2.8 Quest Mobile
    await mobilePage.goto('/quest');
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'quest-mobile.png'),
      fullPage: false,
    });

    // 2.9 Terminal Mobile
    await mobilePage.goto('/terminal');
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, 'terminal-mobile.png'),
      fullPage: false,
    });

    await mobileContext.close();
  });
});
