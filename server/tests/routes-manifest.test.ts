import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isKnownClientRoute, isUnknownPath, getDerivedClientRoutes } from '../src/middleware/defense.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

describe('Route Manifest Build-Time Verification Suite', () => {
  const manifestPath = path.join(repoRoot, 'server/generated/routes.json');

  it('1. routes.json exists, is non-empty, and valid JSON', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(content.trim().length).toBeGreaterThan(0);
    const parsed = JSON.parse(content);
    expect(parsed.staticRoutes).toBeInstanceOf(Array);
    expect(parsed.dynamicRoutes).toBeInstanceOf(Array);
    expect(parsed.allRoutes).toBeInstanceOf(Array);
    expect(parsed.allRoutes.length).toBeGreaterThan(0);
  });

  it('2. Includes every real route from client/src/App.tsx', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    const allRoutes = new Set<string>(manifest.allRoutes);

    const requiredRoutes = [
      '/',
      '/shop',
      '/shop/:id',
      '/cart',
      '/checkout',
      '/order-confirmation/:id',
      '/login',
      '/register',
      '/dashboard',
      '/oracle',
      '/quest',
      '/terminal',
      '/auth/callback',
    ];

    for (const route of requiredRoutes) {
      expect(allRoutes.has(route)).toBe(true);
    }
  });

  it('3. Converts parameters like :id into valid regex patterns', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    const shopDynamic = manifest.dynamicRoutes.find((d: any) => d.route === '/shop/:id');
    expect(shopDynamic).toBeDefined();
    expect(shopDynamic.pattern).toBe('^/shop/[^/]+$');

    const regex = new RegExp(shopDynamic.pattern);
    expect(regex.test('/shop/med-01')).toBe(true);
    expect(regex.test('/shop/delphic-salve')).toBe(true);
    expect(regex.test('/shop/med-01/reviews')).toBe(false);
    expect(regex.test('/shop')).toBe(false);

    const orderDynamic = manifest.dynamicRoutes.find((d: any) => d.route === '/order-confirmation/:id');
    expect(orderDynamic).toBeDefined();
    expect(orderDynamic.pattern).toBe('^/order-confirmation/[^/]+$');

    const orderRegex = new RegExp(orderDynamic.pattern);
    expect(orderRegex.test('/order-confirmation/ord-9921')).toBe(true);
    expect(orderRegex.test('/order-confirmation')).toBe(false);
  });

  it('4. isKnownClientRoute returns true for every real route and false for unknown', () => {
    const knownSamples = [
      '/',
      '/shop',
      '/shop/med-02',
      '/cart',
      '/checkout',
      '/order-confirmation/order-1234',
      '/login',
      '/register',
      '/dashboard',
      '/oracle',
      '/quest',
      '/terminal',
      '/auth/callback',
    ];

    for (const p of knownSamples) {
      expect(isKnownClientRoute(p)).toBe(true);
    }

    const unknownSamples = [
      '/wp-admin',
      '/administrator',
      '/console',
      '/unknown-random-route',
      '/shop/med-01/edit',
    ];

    for (const p of unknownSamples) {
      expect(isKnownClientRoute(p)).toBe(false);
    }
  });

  it('5. isUnknownPath correctly excludes trap paths, /api/*, /assets/*, and static files', () => {
    // Known client routes -> NOT unknown
    expect(isUnknownPath('/')).toBe(false);
    expect(isUnknownPath('/shop')).toBe(false);
    expect(isUnknownPath('/shop/med-05')).toBe(false);
    expect(isUnknownPath('/dashboard')).toBe(false);

    // API endpoints -> NOT unknown (handled by API router)
    expect(isUnknownPath('/api/products')).toBe(false);
    expect(isUnknownPath('/api/auth/login')).toBe(false);

    // Assets -> NOT unknown
    expect(isUnknownPath('/assets/index-abc.js')).toBe(false);
    expect(isUnknownPath('/assets/style-xyz.css')).toBe(false);

    // Static files -> NOT unknown
    expect(isUnknownPath('/favicon.ico')).toBe(false);
    expect(isUnknownPath('/robots.txt')).toBe(false);
    expect(isUnknownPath('/manifest.json')).toBe(false);
    expect(isUnknownPath('/image.png')).toBe(false);

    // Reserved trap paths -> NOT unknown (handled by mirage trap logic)
    expect(isUnknownPath('/.env')).toBe(false);
    expect(isUnknownPath('/admin-old')).toBe(false);
    expect(isUnknownPath('/backup.zip')).toBe(false);
    expect(isUnknownPath('/wp-login.php')).toBe(false);
    expect(isUnknownPath('/phpmyadmin')).toBe(false);
    expect(isUnknownPath('/api/v1/internal/keys')).toBe(false);

    // Truly unknown path probes -> ARE unknown
    expect(isUnknownPath('/wp-admin')).toBe(true);
    expect(isUnknownPath('/administrator')).toBe(true);
    expect(isUnknownPath('/cpanel')).toBe(true);
    expect(isUnknownPath('/random-probe-123')).toBe(true);
  });
});
