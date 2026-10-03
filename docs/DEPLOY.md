# Production Deployment Guide (Render)

This guide walks through deploying **medistore-asclepius** (MediStore: Temple of Asclepius) as a unified single web service on [Render](https://render.com).

---

## 1. Important Note for Hackathon Demonstrations

> [!WARNING]
> **Free-Tier Sleep Warning:**
> Render's free tier spins down web services after 15 minutes of inactivity. The initial wake-up cold start may take 50 to 90 seconds.
> **Open the deployed URL at least 10 minutes before your live demo** to ensure the container is warm, the memory store is initialized, and all routes respond with instant sub-50ms latency.

---

## 2. Automatic Deployment via Blueprint (`render.yaml`)

This repository contains a root `render.yaml` configuration:

1. Push your code to your GitHub / GitLab repository.
2. Sign in to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect the `Medic-Str-mirge-SOC` repository.
5. Render will detect `render.yaml` and configure the service automatically:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/healthz`
6. Click **Apply**.

---

## 3. Manual Web Service Configuration (Alternative)

If setting up manually as a **Web Service**:

1. Click **New +** > **Web Service**.
2. Connect your repository.
3. Configure the settings:
   - **Name:** `medistore-temple`
   - **Language:** `Node`
   - **Branch:** `main`
   - **Root Directory:** (leave blank / root)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/healthz`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render assigns automatically, but defaults to standard port)
   - `SESSION_SECRET`: (Set a random secure string)
   - `VITE_WEB3_MODE`: `mock` (or `live`)
   - `VITE_SEPOLIA_RPC_URL`: (optional if using live mode)
   - `VITE_BATCH_REGISTRY_ADDRESS`: (optional if using live mode)
   - `VITE_TERMINAL_WS_URL`: (optional WebSocket server URL)
5. Click **Create Web Service**.

---

## 4. Verification After Deployment

Once the build finishes:
1. Test health check:
   `curl https://your-app.onrender.com/healthz`
   Expected response: `{"status":"ok"}`
2. Open `https://your-app.onrender.com` in your browser.
3. Test browsing remedies, logging in with `pharmacist@medistore.test` / `Demo@12345`, adding to cart, and checking out.
