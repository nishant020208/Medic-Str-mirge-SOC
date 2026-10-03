# MediStore: Temple of Asclepius - System Architecture

MediStore is a high-craft full-stack pharmacy web application designed with an ancient Greek sanctuary aesthetic blended with modern Web3 cryptographic provenance and defensive security hooks. It functions as the victim web application for **MirageSOC**.

```
                   ┌────────────────────────────────────────┐
                   │             Client (SPA)               │
                   │ React 18, Vite, Tailwind, Zustand,     │
                   │ R3F (3D Hero), ethers v6, Recharts     │
                   └──────────────────┬─────────────────────┘
                                      │  HTTP /api & Session Cookies
                                      ▼
                   ┌────────────────────────────────────────┐
                   │         MirageSOC Stub (First)         │
                   │ (Pass-through now; replaced in SOC)    │
                   └──────────────────┬─────────────────────┘
                                      │
                                      ▼
                   ┌────────────────────────────────────────┐
                   │        Security Layer & Helmet         │
                   │ CSP, CSRF check, Rate Limits, Morgan   │
                   └──────────────────┬─────────────────────┘
                                      │
                                      ▼
                   ┌────────────────────────────────────────┐
                   │         Express API Routes             │
                   │  /healthz, /api/auth, /api/products,   │
                   │  /api/orders, /terminal-ws             │
                   └──────────────────┬─────────────────────┘
                                      │
                                      ▼
                   ┌────────────────────────────────────────┐
                   │         In-Memory Data Store           │
                   │ 40 Medicines, 3 Users, 15 Orders       │
                   └────────────────────────────────────────┘
```

---

## 1. Monorepo Organization

```
medistore/
  client/                    # Frontend React 18 application
    src/
      components/            # Navbar, Footer, 3D Hero, ErrorBoundary
        reactbits/           # Silk, Magnet, BlurText, ClickSpark, CountUp, ScrollVelocity, SpotlightCard
      pages/                 # Home, Catalogue, Product, Cart, Checkout, Dashboard, Oracle, Quest, Terminal
      ui/                    # Atomic library: Button, Card, Input, Select, Badge, Modal, Toast, Skeleton, Tabs, Table...
      store/                 # Zustand stores (cartStore, uiStore, authStore)
      web3/                  # Ethers v6 verifier & deterministic wallet authentication
      styles/                # globals.css with CSS variables and Greek key patterns
    public/                  # robots.txt (with honeypot canary), favicon.svg, manifest.json
    index.html               # Semantic HTML with TODO canary comment
  server/                    # Node 20 Express TypeScript backend
    src/
      data/                  # Seed data, in-memory store, reset capabilities
      middleware/            # Security (Helmet, CSP, CSRF, Rate Limiting), Auth (session checks)
      routes/                # Auth, Products, Orders
      index.ts               # Server entry, WebSocket server, SPA fallback router
    mirage.js                # MirageSOC first-line pass-through stub
    tests/                   # Vitest API and security test suite
  contracts/
    BatchRegistry.sol        # Solidity smart contract for Keccak-256 batch registration
  e2e/
    medistore.spec.ts        # Playwright end-to-end smoke test suite
  docs/                      # ARCHITECTURE.md, WEB3.md, DEPLOY.md, MIRAGE-HOOKS.md
  render.yaml                # Production deployment blueprint
  package.json               # Root monorepo orchestrator
```

---

## 2. Design System: "Temple of Asclepius"

### Color Tokens
- **Marble** (`#F5F1E8`): Purity, ancient stone, and radiant parchment.
- **Lapis** (`#0B1F4B`): Sacred night sanctuary background, deep authority.
- **Gold** (`#C9A227`): Solar deity accents, borders, and cryptographic seals.
- **Terracotta** (`#B5532F`): Urgent alerts, Rx requirements, and earthen warmth.
- **Olive** (`#6B7A3A`): Healing botanicals, verified statuses, and in-stock badges.
- **Ink** (`#14110D`): High-contrast readable typography.

### Typography
- **Headings:** `Cinzel` (Classical Roman / Greek inscriptional lettering).
- **Body Accents & Quotes:** `Cormorant Garamond` (Graceful editorial resonance).
- **UI / Forms / Tables:** `Inter` (Precise data density, WCAG AA legibility).

---

## 3. Security Philosophy

1. **Strict Defense in Depth:** The real application code is hardened with modern standards:
   - Password hashing with `bcryptjs` (cost 10+).
   - Strict Content Security Policy avoiding external CDN vulnerabilities.
   - HttpOnly, SameSite=Lax session cookies with rolling expirations.
   - CSRF headers (`X-Requested-With`) enforced on state-changing methods.
   - Per-IP rate limiting on login (10/min) and general API (120/min).
2. **Intentional Honeypot Canaries:**
   - `/robots.txt` explicitly disallows `/admin-old`.
   - `index.html` leaves a developer comment hinting at unsealed admin corridors.
   - `/quest` provides themed lore directing researchers toward these traps.
   - Server routing leaves these routes unhandled by SPA fallback so MirageSOC can trigger deception traps.
