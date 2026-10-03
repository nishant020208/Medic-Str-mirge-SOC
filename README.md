# MediStore: Temple of Asclepius 🏛️⚕️

> **Consecrated Apothecary of Antiquity & Decentralized Oracle Ledger**  
> *The VICTIM Application for MirageSOC Security Research & Hackathon Demonstrations.*

![License](https://img.shields.io/badge/License-MIT-gold.svg)
![Node](https://img.shields.io/badge/Node-v20%2B-blue.svg)
![React](https://img.shields.io/badge/React-18.3-cyan.svg)
![Web3](https://img.shields.io/badge/Web3-Sepolia%20%7C%20Mock-goldenrod.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)

---

## 🏛️ Screenshots

| Hero & 3D Rod of Asclepius | Apothecary Dispensary |
| :---: | :---: |
| *[Screenshot Placeholder: 3D Gold Rod of Asclepius & Greek Hero]* | *[Screenshot Placeholder: Filtered Catalogue & Product Cards]* |

| On-Chain Batch Verification | Pharmacist Sanctum Dashboard |
| :---: | :---: |
| *[Screenshot Placeholder: Sealed by the Oracle Web3 Modal]* | *[Screenshot Placeholder: Inventory & Recharts Analytics]* |

| Oracle Consultation Hearth | Oracle Retro Terminal |
| :---: | :---: |
| *[Screenshot Placeholder: Pythia Chat Interface]* | *[Screenshot Placeholder: Bronze retro terminal UI]* |

---

## ⚕️ What It Is

**MediStore: Temple of Asclepius** is a complete, fully functioning, high-craft pharmacy web application rooted in ancient Hellenic medical traditions and fortified with cryptographic batch provenance. 

It serves as the **victim application** for the **MirageSOC** hackathon project, providing realistic e-commerce and administrative workflows alongside intentional honeypot canaries (`/admin-old`, `/.env`, `/terminal`) that MirageSOC intercepts and defends.

> [!NOTE]
> **Demo Application Notice:**  
> All medications, transactions, accounts, and batch numbers are synthetic simulations for security education and demonstrations. Not medical advice. No real orders are processed.

---

## ⚡ Tech Stack

### Frontend (`client/`)
- **Core:** React 18, Vite 6, TypeScript (strict), React Router v6
- **Styling & Design System:** Tailwind CSS, `@fontsource` (Cinzel, Cormorant Garamond, Inter)
- **3D & Animation:** `@react-three/fiber`, `@react-three/drei`, `three`, `framer-motion`
- **React Bits Components:** `Silk` (ambient shader background), `BlurText`, `Magnet`, `ClickSpark`, `CountUp`, `ScrollVelocity`, `SpotlightCard`
- **State Management:** `zustand` (persisted cart and UI theme)
- **Forms & Validation:** `react-hook-form`, `@hookform/resolvers`, `zod`
- **Charts & Icons:** `recharts`, `lucide-react`
- **Web3 Integration:** `ethers` v6 (Sepolia smart contract querying & deterministic mock ledger)

### Backend (`server/`)
- **Runtime:** Node 20+, Express 4, TypeScript (`tsx`)
- **Session:** `express-session` backed by `memorystore`
- **Security & Hardening:** `helmet` (strict CSP), `express-rate-limit`, `bcryptjs`, CSRF protection (`X-Requested-With`)
- **Logging & Compression:** `morgan` (with client IP `req.ip`), `compression`, `cors`
- **Real-time Terminal:** `ws` WebSocket server

### Data & Contracts
- **In-Memory Store:** Seeded with 40 Hellenic medicinal formulations, 3 test users, 15 sample consignments
- **Smart Contract:** `contracts/BatchRegistry.sol` (Solidity `^0.8.20`) for Keccak-256 batch registration

---

## 🔑 Demo Accounts

The in-memory database is pre-seeded with the following credentials:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Chief Pharmacist** | `pharmacist@medistore.test` | `Demo@12345` | `/dashboard` (KPIs, Inventory Edit, Order Status) |
| **Initiate Customer** | `customer@medistore.test` | `Demo@12345` | Standard dispensary requisition, order history |
| **Apprentice** | `apprentice@medistore.test` | `Demo@12345` | Standard customer access |

*(Quick-fill buttons are provided on the `/login` page for instant testing during judging!)*

---

## ⚙️ Environment Variables

Configure these in `.env` (templates in `.env.example`, `server/.env.example`, `client/.env.example`):

### Server (`server/.env`)
- `PORT`: Server port (default: `5000`)
- `NODE_ENV`: `development` | `production` | `test`
- `SESSION_SECRET`: Secret passphrase for session cookie encryption
- `CSP_CONNECT_EXTRA`: Optional space-separated extra domains for CSP connect-src

### Client (`client/.env`)
- `VITE_WEB3_MODE`: `mock` (default, zero-internet ledger) or `live` (Sepolia testnet)
- `VITE_BATCH_REGISTRY_ADDRESS`: Deployed `BatchRegistry.sol` address on Sepolia
- `VITE_SEPOLIA_RPC_URL`: Sepolia JSON-RPC provider (e.g. Infura / Alchemy / public RPC)
- `VITE_TERMINAL_WS_URL`: WebSocket URL for the Oracle terminal (e.g. `ws://localhost:5000/terminal-ws`)

---

## 🚀 Quickstart & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed In-Memory Database
```bash
npm run seed
```

### 3. Run Development Servers (Client + Backend)
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:5000`

### 4. Build for Production
```bash
npm run build
```

### 5. Start Production Server
```bash
npm run start
```
Express serves the built client (`client/dist`) and API on port 5000.

---

## 🧪 Testing

```bash
# Run Vitest API & Security Unit Tests
npm test

# Run Playwright End-to-End Smoke Tests (Browse, Cart, Checkout, Auth, Dashboard, Web3)
npm run test:e2e

# Run Workspace Typechecks and Linting
npm run lint
```

---

## 🛡️ How to Plug in MirageSOC

This web app contains pre-wired hooks specifically constructed for **MirageSOC**:

1. **Pass-Through Stub:** Located at `server/mirage.js`.
2. **First Middleware:** Mounted in `server/src/index.ts` before static assets, body parsers, and API routers.
3. **Login Hooks:** Triggers `mirage.loginFailed` and `mirage.loginSucceeded` on every email or wallet authentication attempt.
4. **Preserved Traps:** Trap endpoints (`/admin-old`, `/.env`) are strictly avoided by the SPA fallback, allowing MirageSOC to intercept them.

👉 Read the complete integration guide at [docs/MIRAGE-HOOKS.md](docs/MIRAGE-HOOKS.md).

---

## 📁 Repository Directory Map

```
medistore/
├── client/                     # Vite + React 18 Frontend
│   ├── src/
│   │   ├── components/         # 3D Hero, Navbar, Footer, ErrorBoundary
│   │   │   └── reactbits/      # Silk, Magnet, BlurText, ClickSpark, CountUp, etc.
│   │   ├── pages/              # Home, Shop, Product, Cart, Checkout, Dashboard, Oracle, Terminal...
│   │   ├── ui/                 # Reusable UI primitives (Button, Card, Badge, Modal, etc.)
│   │   ├── store/              # Zustand state (Cart, Auth, UI)
│   │   └── web3/               # Batch verifier & deterministic wallet auth
│   └── public/                 # Favicon, manifest, robots.txt
├── server/                     # Express 4 + TypeScript Backend
│   ├── src/
│   │   ├── data/               # Seed data & in-memory store
│   │   ├── middleware/         # Security, CSRF, Rate Limiting, Auth
│   │   └── routes/             # Auth, Products, Orders
│   ├── mirage.js               # MirageSOC pass-through stub
│   └── tests/                  # Vitest API test suite
├── contracts/
│   └── BatchRegistry.sol       # Solidity smart contract
├── docs/                       # ARCHITECTURE.md, WEB3.md, DEPLOY.md, MIRAGE-HOOKS.md
├── e2e/                        # Playwright automated smoke tests
├── render.yaml                 # Render Blueprint deployment specification
└── package.json                # Monorepo root scripts
```

---

## 🌐 Deployment (Render)

Deploy with a single click using Render Blueprint:
1. Connect this repository to [Render](https://dashboard.render.com).
2. Create a **New Blueprint** using `render.yaml`.
3. Set your environment variables in the Render Dashboard.

👉 Follow the full deployment instructions and free-tier tips in [docs/DEPLOY.md](docs/DEPLOY.md).