# MediStore: Temple of Asclepius — Tri-Theme Architecture System

## 1. Executive Summary & Philosophy

MediStore features a three-mode semantic design system rooted in ancient Hellenic sanctuary motifs harmonized with contemporary Web3 aesthetics:

1. **Light: "Marble Day"**
   - *Inspiration*: Sunlit Athenian Acropolis, Pentelic marble colonnades, Corinthian bronze accents, and ceremonial olive groves.
   - *Palette*: Crisp marble backdrop (`#F5F1E8`), elevated papyrus surfaces (`#FBF8F1`), dark obsidian ink (`#14110D`), deep Lapis Lazuli primary (`#0B1F4B`), and ancient gold (`#7A5C00` / `#948565` UI boundaries).
2. **Dark: "Night Temple"**
   - *Inspiration*: Nighttime sanctuaries illuminated by votive torches and the Aegean cosmos. Replaces uncalibrated high-contrast darks with elevation-based surfaces and soft gold luminescence.
   - *Palette*: Deep nocturnal navy (`#070E1F`), elevated altar chambers (`#0E1A33` / `#162447`), desaturated cream text (`#F2EDE0` — never harsh pure white), warm starlight gold (`#E0B84A` / `#0B1F4B` on-primary), and calibrated sapphire borders (`#4E68AD`).
3. **Aesthetic: "Olympus Dusk"**
   - *Inspiration*: Dreamy Mount Olympus sunsets with celestial amber and amethyst haze, frosted crystalline glass vessels, and rose-gold meander tracery.
   - *Palette*: Peach-to-lavender atmospheric gradient (`#FDE9DC` to `#E9D5F2`), frosted glass cards (`rgba(255, 255, 255, 0.62)` with `backdrop-filter: blur(16px)`), deep imperial plum text (`#2B1B2F`), rich crimson primary (`#7A2E4D`), soft rose-gold accents (`#8A4A55`), and subtle CSS grain overlay (3% opacity).

---

## 2. Semantic Token Architecture & Single Source of Truth

All color decisions emanate from semantic CSS variables declared on `[data-theme="light" | "dark" | "aesthetic"]` inside [`client/src/styles/themes.css`](file:///c:/Users/NISHANT/OneDrive/Desktop/Medic-Str-mirge-SOC/client/src/styles/themes.css).

Tailwind classes map strictly to these tokens without hardcoded hex, rgb, or raw palette utilities:

| Semantic Token | Tailwind Class | Semantic Purpose | Light Value | Dark Value | Aesthetic Value |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--bg` | `bg-bg` | Page canvas background | `#F5F1E8` | `#070E1F` | `#FDE9DC` |
| `--bg-gradient` | (CSS gradient) | Radial or linear gradient | Solid `#F5F1E8` | Radial starlight | Peach to Lavender linear |
| `--surface` | `bg-surface` | Primary card / modal surface | `#FBF8F1` | `#0E1A33` | `rgba(255, 255, 255, 0.62)` |
| `--surface-2` | `bg-surface-2` | Elevated controls / table rows | `#EDE6D6` | `#162447` | `rgba(255, 255, 255, 0.40)` |
| `--surface-glass` | `bg-surface-glass`| Translucent frosted container | `rgba(251, 248, 241, 0.82)` | `rgba(14, 26, 51, 0.78)` | `rgba(255, 255, 255, 0.62)` |
| `--border` | `border-border`| UI element bounding perimeter | `#948565` (3.41:1 AA) | `#4E68AD` (3.22:1 AA) | `#936D88` (3.98:1 AA) |
| `--text` | `text-text` | Primary body and heading copy | `#14110D` (17.75:1) | `#F2EDE0` (14.80:1) | `#2B1B2F` (14.64:1) |
| `--text-muted` | `text-text-muted`| Secondary metadata / labels | `#554D3D` (6.99:1) | `#9EABCF` (8.53:1) | `#644F6A` (6.64:1) |
| `--primary` | `bg-primary` | Main action buttons / badges | `#0B1F4B` | `#E0B84A` | `#7A2E4D` |
| `--primary-hover` | `hover:bg-primary-hover` | Hover state for primary actions | `#162E6B` | `#EECB68` | `#933B60` |
| `--text-on-primary` | `text-text-on-primary` | Text rendered atop `--primary` | `#F5F1E8` (14.20:1) | `#0B1F4B` (8.48:1) | `#FFF7EE` (8.51:1) |
| `--accent` | `text-accent` / `bg-accent` | Decorative icons, borders, sparks | `#C9A227` | `#C9A227` | `#B76E79` |
| `--accent-text` | `text-accent-text` | Legible text-accent on surfaces | `#7A5C00` (5.90:1) | `#DEC267` (9.16:1) | `#773742` (8.19:1) |
| `--success` | `text-success` | Healthy stock, completed rites | `#334B16` (7.35:1) | `#A3CC66` (8.85:1) | `#2E591B` (7.13:1) |
| `--warning` | `text-warning` | Low-stock cautions, warnings | `#7F4800` (6.66:1) | `#E6A84D` (8.49:1) | `#7A4200` (6.65:1) |
| `--danger` | `text-danger` | 403 Forbidden, errors, out of stock | `#8F260E` (6.50:1) | `#F07A60` (7.51:1) | `#8F2A38` (6.75:1) |
| `--info` | `text-info` | Metadata badges, info alerts | `#12386E` (8.20:1) | `#7BA2DF` (9.05:1) | `#43326B` (7.80:1) |
| `--ring` | `focus:ring-ring` | Focus ring outline for a11y | `#0B1F4B` | `#E0B84A` | `#7A2E4D` |
| `--chart-1`..`--chart-6` | (Recharts series) | Quantitative data visualization | Gold / Bronze / Lapis series | Starlight / Azure / Gold series | Rose / Orchid / Coral series |
| `--scene-bg` | Three.js clear | WebGL Hero Canvas clear color | Transparent | Transparent | Transparent |
| `--scene-metal` | Three.js shader | Caduceus serpent gold material | Gold (`#C9A227`) | Torch Gold (`#E0B84A`) | Rose Gold (`#B76E79`) |
| `--particle` | Three.js particles | Ethereal floating sparks | `#C9A227` | `#E0B84A` | `#B76E79` |

---

## 3. WCAG 2.1 AA Contrast Ratios (Automated Proof)

Every token pair is tested programmatically via [`scripts/check-contrast.ts`](file:///c:/Users/NISHANT/OneDrive/Desktop/Medic-Str-mirge-SOC/scripts/check-contrast.ts) (`npm run test:contrast`). All pairs satisfy WCAG AA minimums (≥ 4.5:1 for normal copy, ≥ 3.0:1 for graphical UI boundaries and large headings).

### 3.1 Light ("Marble Day")
- Normal Text on Surface: **17.75:1** (Min: 4.5:1) — **PASS**
- Text-Muted on Surface: **6.99:1** (Min: 4.5:1) — **PASS**
- Accent-Text on Surface: **5.90:1** (Min: 4.5:1) — **PASS**
- Danger on Surface: **6.50:1** (Min: 4.5:1) — **PASS**
- Success on Surface: **7.35:1** (Min: 4.5:1) — **PASS**
- Text on Primary: **14.20:1** (Min: 4.5:1) — **PASS**
- Border vs Surface (UI boundary): **3.41:1** (Min: 3.0:1) — **PASS**

### 3.2 Dark ("Night Temple")
- Normal Text on Surface: **14.80:1** (Min: 4.5:1) — **PASS**
- Text-Muted on Surface: **8.53:1** (Min: 4.5:1) — **PASS**
- Accent-Text on Surface: **9.16:1** (Min: 4.5:1) — **PASS**
- Danger on Surface: **7.51:1** (Min: 4.5:1) — **PASS**
- Success on Surface: **8.85:1** (Min: 4.5:1) — **PASS**
- Text on Primary: **8.48:1** (Min: 4.5:1) — **PASS**
- Border vs Surface (UI boundary): **3.22:1** (Min: 3.0:1) — **PASS**

### 3.3 Aesthetic ("Olympus Dusk")
*Calculated across glass composited over worst-case gradient extremities (`#FDE9DC` peach and `#E9D5F2` lavender):*
- Normal Text on Glass Card: **14.36:1 to 15.22:1** (Min: 4.5:1) — **PASS**
- Text-Muted on Glass Card: **6.51:1 to 6.90:1** (Min: 4.5:1) — **PASS**
- Accent-Text on Glass Card: **8.03:1 to 8.51:1** (Min: 4.5:1) — **PASS**
- Danger on Glass Card: **6.34:1 to 6.44:1** (Min: 4.5:1) — **PASS**
- Success on Glass Card: **7.00:1 to 7.41:1** (Min: 4.5:1) — **PASS**
- Text on Primary: **8.51:1** (Min: 4.5:1) — **PASS**
- Border vs Surface (UI boundary): **3.98:1** (Min: 3.0:1) — **PASS**

---

## 4. Zero-FOUC Implementation & CSP Integrity

To eliminate flash-of-unstyled-content (FOUC) while maintaining an uncompromising, strict Content Security Policy without `'unsafe-inline'`:

1. An inline blocking script is embedded inside `<head>` in `client/index.html`.
2. The script immediately reads `localStorage.getItem('medistore_theme')` (falling back to `prefers-color-scheme`), sets `data-theme` and `class="dark"` on `document.documentElement`, and syncs `<meta name="theme-color">`.
3. The exact SHA-256 hash of this inline script is whitelisted in Helmet CSP `scriptSrc`:
   ```ts
   // server/src/middleware/security.ts
   scriptSrc: [
     "'self'",
     "'sha256-6/nvNoB4Ou7d8KfDwSJvWdJLQRerERILjwXhs8rGvGc='",
   ],
   ```
4. Cross-tab synchronization is maintained via a `storage` event listener in `themeStore.ts`.

---

## 5. Live Scene Reactions & Motion Resilience

- **Three.js Hero (`AsclepiusHero3D.tsx`)**: The `<Canvas>` remains permanently mounted when switching themes. It subscribes to theme changes and updates material metalness, roughness, light intensities, and fog dynamically reading `--scene-*` and `--particle` tokens without webGL context destruction or memory leakage.
- **Static SVG Fallback**: When WebGL is unavailable or when running in low-power/testing environments, a dedicated SVG fallback automatically renders with reactive theme stroke colors.
- **Transitions & Reduced Motion**: Theme token changes trigger a smooth 250ms CSS transition across color, background, and borders. If `prefers-reduced-motion: reduce` is active, transitions become instant (0ms) to respect user accessibility preferences.

---

## 6. How to Add a 4th Theme (Developer Guide)

To add a new theme (for example, `ThemeMode = 'aegean'`):

1. **Extend Type Definition**:
   In `client/src/store/themeStore.ts`, append `'aegean'` to `ThemeMode`:
   ```ts
   export type ThemeMode = 'light' | 'dark' | 'aesthetic' | 'aegean';
   ```

2. **Define Semantic Tokens in `themes.css`**:
   In `client/src/styles/themes.css`, append the selector block:
   ```css
   [data-theme="aegean"] {
     color-scheme: light;
     --bg: #E6F0F8;
     --surface: #F2F7FC;
     --surface-2: #DCE8F4;
     --border: #4A7A9E;
     --text: #0A2239;
     --text-muted: #3B5F7F;
     --primary: #125E8A;
     --text-on-primary: #FFFFFF;
     --accent: #2E86AB;
     --accent-text: #0E4B6E;
     ...
   }
   ```

3. **Register in Switcher**:
   In `client/src/components/ThemeSwitcher.tsx`, add an entry to `THEME_OPTIONS`:
   ```ts
   { mode: 'aegean', label: 'Aegean mode', icon: Waves }
   ```

4. **Verify Quality Gates**:
   Run the automated suites to verify contrast and color discipline:
   ```bash
   npm run test:contrast
   npm run lint:colors
   npm test
   ```
