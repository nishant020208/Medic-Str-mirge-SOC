# medistore-asclepius 🏛️⚕️

> **MediStore: Temple of Asclepius — Consecrated Apothecary of Antiquity & Decentralized Oracle Ledger**  
> *The VICTIM Application for MirageSOC Security Research & Hackathon Demonstrations.*

![License](https://img.shields.io/badge/License-MIT-gold.svg)
![Node](https://img.shields.io/badge/Node-v20%2B-blue.svg)
![React](https://img.shields.io/badge/React-18.3-cyan.svg)
![Web3](https://img.shields.io/badge/Web3-Sepolia%20%7C%20Mock-goldenrod.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)
![Contrast](https://img.shields.io/badge/WCAG%20AA-100%25%20Passed-brightgreen.svg)
![Color Lint](https://img.shields.io/badge/Color%20Lint-0%20Violations-brightgreen.svg)
![Tests](https://img.shields.io/badge/Vitest-31%2F31%20Passed-brightgreen.svg)
![E2E](https://img.shields.io/badge/Playwright-7%2F7%20Suites%20Passed-brightgreen.svg)

---

## 🏛️ Tri-Theme Gallery & Visual Comparison

MediStore features a three-mode design system where every component strictly consumes semantic tokens declared in [`client/src/styles/themes.css`](file:///c:/Users/NISHANT/OneDrive/Desktop/Medic-Str-mirge-SOC/client/src/styles/themes.css):

### 1. Desktop Experience (1440×900 Viewport)

| Page View | Light: "Marble Day" | Dark: "Night Temple" | Aesthetic: "Olympus Dusk" |
| :--- | :---: | :---: | :---: |
| **Temple Grounds (`/`)** | ![Home Light](docs/screenshots/light/home-desktop.png) | ![Home Dark](docs/screenshots/dark/home-desktop.png) | ![Home Aesthetic](docs/screenshots/aesthetic/home-desktop.png) |
| **Apothecary Shop (`/shop`)** | ![Shop Light](docs/screenshots/light/shop-desktop.png) | ![Shop Dark](docs/screenshots/dark/shop-desktop.png) | ![Shop Aesthetic](docs/screenshots/aesthetic/shop-desktop.png) |
| **Remedy Provenance (`/shop/:id`)** | ![Product Light](docs/screenshots/light/product-desktop.png) | ![Product Dark](docs/screenshots/dark/product-desktop.png) | ![Product Aesthetic](docs/screenshots/aesthetic/product-desktop.png) |
| **Requisition Basket (`/cart`)** | ![Cart Light](docs/screenshots/light/cart-desktop.png) | ![Cart Dark](docs/screenshots/dark/cart-desktop.png) | ![Cart Aesthetic](docs/screenshots/aesthetic/cart-desktop.png) |
| **Sanctum Dashboard (`/dashboard`)** | ![Dashboard Light](docs/screenshots/light/dashboard-desktop.png) | ![Dashboard Dark](docs/screenshots/dark/dashboard-desktop.png) | ![Dashboard Aesthetic](docs/screenshots/aesthetic/dashboard-desktop.png) |
| **Pythia Oracle (`/oracle`)** | ![Oracle Light](docs/screenshots/light/oracle-desktop.png) | ![Oracle Dark](docs/screenshots/dark/oracle-desktop.png) | ![Oracle Aesthetic](docs/screenshots/aesthetic/oracle-desktop.png) |
| **Admin Console (`/terminal`)** | ![Terminal Light](docs/screenshots/light/terminal-desktop.png) | ![Terminal Dark](docs/screenshots/dark/terminal-desktop.png) | ![Terminal Aesthetic](docs/screenshots/aesthetic/terminal-desktop.png) |

### 2. Mobile Experience (390×844 Viewport)

| Mobile View | Light: "Marble Day" | Dark: "Night Temple" | Aesthetic: "Olympus Dusk" |
| :--- | :---: | :---: | :---: |
| **Home Mobile** | ![Home Mobile Light](docs/screenshots/light/home-mobile.png) | ![Home Mobile Dark](docs/screenshots/dark/home-mobile.png) | ![Home Mobile Aesthetic](docs/screenshots/aesthetic/home-mobile.png) |
| **Shop Mobile** | ![Shop Mobile Light](docs/screenshots/light/shop-mobile.png) | ![Shop Mobile Dark](docs/screenshots/dark/shop-mobile.png) | ![Shop Mobile Aesthetic](docs/screenshots/aesthetic/shop-mobile.png) |
| **Terminal Mobile** | ![Terminal Mobile Light](docs/screenshots/light/terminal-mobile.png) | ![Terminal Mobile Dark](docs/screenshots/dark/terminal-mobile.png) | ![Terminal Mobile Aesthetic](docs/screenshots/aesthetic/terminal-mobile.png) |

---

## 🎨 The Tri-Theme System & Architecture

1. **Light: "Marble Day"**
   - Pentelic marble background (`#F5F1E8`), elevated papyrus surfaces (`#FBF8F1`), dark obsidian ink (`#14110D`), deep Lapis primary (`#0B1F4B`), and ancient gold (`#7A5C00` / `#948565` UI boundaries).
2. **Dark: "Night Temple"**
   - Nocturnal navy (`#070E1F`), elevated altar chambers (`#0E1A33` / `#162447`), desaturated cream text (`#F2EDE0` — never pure white), starlight gold (`#E0B84A` / `#0B1F4B` on-primary), and calibrated sapphire borders (`#4E68AD`). 1px borders instead of heavy shadows, desaturated colors to avoid vibration, and zero pure black backgrounds.
3. **Aesthetic: "Olympus Dusk"**
   - Peach-to-lavender gradient (`#FDE9DC` to `#E9D5F2`), frosted glass cards (`rgba(255, 255, 255, 0.62)` with `backdrop-filter: blur(16px)`), deep imperial plum text (`#2B1B2F`), rich crimson primary (`#7A2E4D`), rose-gold accents (`#8A4A55`), and subtle CSS grain overlay (3% opacity).

### Theme Switcher Controls
- **Segmented Radio Control:** 3-way toggle in navbar and mobile drawer (`Sun`, `Moon`, `Sparkles`).
- **Keyboard Navigable:** Full Arrow Key (`ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown`) navigation with active ARIA radio attributes.
- **Zero-FOUC Guarantee:** Synchronous inline `<script>` in `index.html` sets `data-theme` and `class="dark"` before rendering, whitelisted by exact SHA-256 hash in Helmet CSP.
- **Live Reactive 3D Scene:** Three.js `<Canvas>` stays permanently mounted; scene lighting, fog, and serpent shaders react live to `--scene-*` variables.
- **Motion Resilience:** Smooth 250ms CSS transition across colors and surfaces, instantly bypassing (0ms) when `prefers-reduced-motion: reduce` is enabled.
- **Cross-Tab Synchronization:** Instant broadcast via window `storage` event listener.

---

## ⚕️ What It Is

**medistore-asclepius** is a complete, polished, fully operational pharmaceutical application blending ancient Hellenic mythic medicine with cryptographic provenance and state-of-the-art web performance.

It acts as the **VICTIM application** for the **MirageSOC** security architecture, presenting realistic healthcare e-commerce and inventory workflows while hosting intentional canary trap endpoints (`/admin-old`, `/.env`, `/backup.zip`, `/wp-login.php`, `/phpmyadmin`, `/api/v1/internal/keys`) that MirageSOC intercepts and defends.

> [!NOTE]
> **Demo Application Notice:**  
> All medications, transactions, accounts, and batch numbers are synthetic simulations for security education and hackathon demonstrations. Not medical advice. No real orders are processed.

---

## ⚡ Tech Stack

### Frontend (`client/`)
- **Core:** React 18, Vite 6, TypeScript (strict), React Router v6
- **Code-Splitting:** Dynamic route chunking via `React.lazy` and `Suspense` for minimal initial bundle overhead
- **Typography & Self-Hosting:** `@fontsource/cinzel`, `@fontsource/cormorant-garamond`, `@fontsource/inter` (100% self-hosted, strict CSP compliant, zero external CDN reliance)
- **Styling:** Semantic CSS variables mapped to Tailwind utilities with strict WCAG AA contrast compliance
- **3D & Motion:** `@react-three/fiber`, `@react-three/drei`, `three`, `framer-motion` (with automatic fallback on mobile, prefers-reduced-motion, and missing WebGL)
- **Charts:** Recharts dynamic SVG theming reading from `--chart-1`..`6`, `--surface`, and `--border`
- **React Bits Components:** `Silk`, `ClickSpark`, `SpotlightCard`, `ScrollVelocity`
- **State:** `zustand` (persisted Requisition Cart, Auth, and Theme state)
- **Forms & Contracts:** `react-hook-form`, `zod`, `ethers` v6 (Sepolia smart contract querying & deterministic mock ledger)

### Backend (`server/`)
- **Runtime:** Node 20+, Express 4, TypeScript (`tsx` in dev, `tsc` compiled in prod)
- **Session:** `express-session` with `memorystore`
- **Security & Hardening:** `helmet` (strict CSP with inline script sha256 hash), `express-rate-limit` (10 login attempts/min threshold), CSRF check (`X-Requested-With`), Zod input validation
- **Logging:** `morgan` logging real client IP (`req.ip`) with `trust proxy` enabled
- **Terminal Daemon:** Safe placeholder WebSocket endpoint (`/terminal-ws`) OFF by default; enabled strictly via `ENABLE_LOCAL_TERMINAL_ECHO=true`

---

## 🔑 Accounts for Testing

The dispensary is pre-seeded with the following credentials (enter directly on `/login`):

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Chief Pharmacist** | `pharmacist@medistore.test` | `Demo@12345` | `/dashboard` (KPIs, Inventory Adjust, Order Logs) |
| **Initiate Customer** | `customer@medistore.test` | `Demo@12345` | Dispensary ordering; `/dashboard` displays themed 403 |
| **Apprentice** | `apprentice@medistore.test` | `Demo@12345` | Customer level access |

*(In production mode, credentials are kept secure and not shown on the UI).*

---

## 💾 Plug-and-Play Database Connection

MediStore features zero-downtime, plug-and-play database support. By default, it operates with zero configuration using its built-in in-memory dispensary store. When you are ready to connect your database, simply supply either environment variable:

### 1. PostgreSQL (Supabase / Neon / Railway / Vercel Postgres / AWS RDS)
```env
DATABASE_URL=postgres://user:password@hostname:5432/medistore?sslmode=require
```
- **Auto-Provisioning:** Creates tables (`users`, `products`, `orders`) on first boot.
- **Auto-Seeding:** Automatically populates catalog and accounts if the database is newly initialized.
- **Fail-Safe Fallback:** If the connection is unreachable or credentials invalid, it seamlessly falls back to in-memory store to prevent downtime.

### 2. MongoDB (MongoDB Atlas / Self-Hosted)
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/medistore?retryWrites=true&w=majority
```
- **Auto-Provisioning:** Creates collections and unique indexes (`users.email`, `products.id`, `orders.id`).
- **Auto-Seeding:** Seeds initial records if empty.

---

## 📊 Lighthouse Mobile Audit Scores (All 3 Themes)

Audits executed against the production build using Lighthouse Mobile Emulation (4x CPU slowdown, 1.6 Mbps 4G throttling). All HTML and JSON reports are preserved in `docs/lighthouse/<theme>/`:

| Theme Mode | Page Audited | Route | Performance | Accessibility | Best Practices | SEO | Target Verification |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Light** | **Home** | `/?theme=light` | **89** | **100** | **96** | **100** | Perf 89/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Light** | **Shop** | `/shop?theme=light` | **91** | **100** | **96** | **100** | Perf 91/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Light** | **Product** | `/shop/med-01?theme=light` | **93** | **100** | **96** | **100** | Perf 93/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Dark** | **Home** | `/?theme=dark` | **90** | **100** | **96** | **100** | Perf 90/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Dark** | **Shop** | `/shop?theme=dark` | **89** | **100** | **96** | **100** | Perf 89/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Dark** | **Product** | `/shop/med-01?theme=dark` | **93** | **100** | **96** | **100** | Perf 93/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Aesthetic** | **Home** | `/?theme=aesthetic` | **90** | **100** | **96** | **100** | Perf 90/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Aesthetic** | **Shop** | `/shop?theme=aesthetic` | **91** | **100** | **96** | **100** | Perf 91/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |
| **Aesthetic** | **Product** | `/shop/med-01?theme=aesthetic` | **92** | **100** | **96** | **100** | Perf 92/100, A11y 100/100, BP 96/100, SEO 100/100 ✅ |

---

## 🧪 Quality Gate & Audit Commands

```bash
# 1. Automated WCAG 2.1 AA Mathematical Contrast Gate
npm run test:contrast

# 2. Strict Color Linter (zero raw Tailwind classes or hex colors outside themes.css)
npm run lint:colors

# 3. TypeScript Strict Type-Check (Client & Server)
npm run lint

# 4. Vitest Unit & Integration Suite (API, Trap Routes, Mirage Hooks, Terminal Safety)
npm test

# 5. Playwright E2E Tri-Theme Matrix (3 themes x 12 pages x 2 viewports + axe-core checks)
npx playwright test e2e/theme-matrix.spec.ts

# 6. Tri-Theme Lighthouse Mobile Audits (Generates reports in docs/lighthouse/<theme>/)
npm run test:lighthouse

# 7. Production Build (Vite client bundle & tsc server)
npm run build
```

---

## 🛡️ MirageSOC Hook Integration

1. **Mirage Middleware First:** `server/src/index.ts` mounts `mirage` as the very first middleware before static assets, API routers, and body parsers.
2. **Replaced Pass-Through:** `server/mirage.js` is the insertion point where MirageSOC hooks its inspection engine.
3. **Authentication Callbacks:** Both email and wallet sign-ins dispatch `mirage.loginFailed(req, user)` and `mirage.loginSucceeded(req, user)`.
4. **Reserved Trap Paths:** Endpoints (`/admin-old`, `/.env`, `/backup.zip`, `/wp-login.php`, `/phpmyadmin`, `/api/v1/internal/keys`, case-insensitive with or without trailing slash) return 404 plain text `"Not found"` and are never swallowed by the SPA fallback, leaving them open for MirageSOC canaries.
5. **Terminal Daemon:** MirageSOC attaches its interactive sandbox by setting `VITE_TERMINAL_WS_URL`.

---

## 📱 Phone & LAN Readiness

Both development and production environments bind to `0.0.0.0` to permit testing across mobile phones and devices on your local network:

1. **Development Server:**
   ```bash
   npm run dev
   ```
   (Vite listens on `http://0.0.0.0:5173` with `--host`).

2. **Production Server:**
   ```bash
   npm run build
   npm run start
   ```
   (Express listens on `http://0.0.0.0:5000`).

3. **Open on your phone:**
   Open `http://<YOUR-PC-IP>:5173` or `http://<YOUR-PC-IP>:5000` on your mobile phone browser.